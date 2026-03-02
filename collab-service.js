/**
 * Collaboration Board WebSocket Server
 * Handles real-time synchronization between clients
 */

const { WebSocketServer } = require('ws');

const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });

// Room storage: roomId -> { clients: Map<ws, ClientInfo>, elements: Element[] }
const rooms = new Map();

// Client info structure
class ClientInfo {
  constructor(ws, userId, username, color) {
    this.ws = ws;
    this.userId = userId;
    this.username = username;
    this.color = color;
    this.cursor = { x: 0, y: 0 };
  }
}

// Generate random user color
function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Generate unique room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Broadcast to all clients in a room except sender
function broadcastToRoom(roomId, message, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  const messageStr = JSON.stringify(message);
  room.clients.forEach((client, ws) => {
    if (ws !== excludeWs && ws.readyState === 1) {
      ws.send(messageStr);
    }
  });
}

// Broadcast to all clients in a room including sender
function broadcastToRoomAll(roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return;

  const messageStr = JSON.stringify(message);
  room.clients.forEach((client, ws) => {
    if (ws.readyState === 1) {
      ws.send(messageStr);
    }
  });
}

console.log(`WebSocket server starting on port ${PORT}...`);

wss.on('connection', (ws) => {
  let currentRoomId = null;
  let clientInfo = null;

  console.log('New client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, payload } = message;

      switch (type) {
        case 'create-room': {
          const roomId = generateRoomId();
          const userId = payload.userId || Math.random().toString(36).substring(2, 10);
          const username = payload.username || 'Anonymous';
          const color = getRandomColor();

          rooms.set(roomId, {
            clients: new Map(),
            elements: [],
            createdAt: Date.now()
          });

          clientInfo = new ClientInfo(ws, userId, username, color);
          rooms.get(roomId).clients.set(ws, clientInfo);
          currentRoomId = roomId;

          ws.send(JSON.stringify({
            type: 'room-created',
            payload: {
              roomId,
              userId,
              username,
              color,
              elements: [],
              users: [{
                userId,
                username,
                color,
                cursor: { x: 0, y: 0 }
              }]
            }
          }));

          console.log(`Room created: ${roomId} by ${username}`);
          break;
        }

        case 'join-room': {
          const { roomId, userId, username } = payload;

          if (!rooms.has(roomId)) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Room not found' }
            }));
            return;
          }

          const room = rooms.get(roomId);
          const color = getRandomColor();
          clientInfo = new ClientInfo(ws, userId, username || 'Anonymous', color);
          room.clients.set(ws, clientInfo);
          currentRoomId = roomId;

          // Notify others in the room
          broadcastToRoom(roomId, {
            type: 'user-joined',
            payload: {
              userId,
              username: clientInfo.username,
              color: clientInfo.color,
              cursor: clientInfo.cursor
            }
          }, ws);

          // Send room state to new client
          ws.send(JSON.stringify({
            type: 'room-joined',
            payload: {
              roomId,
              userId,
              username: clientInfo.username,
              color,
              elements: room.elements,
              users: Array.from(room.clients.values()).map(c => ({
                userId: c.userId,
                username: c.username,
                color: c.color,
                cursor: c.cursor
              }))
            }
          }));

          console.log(`User ${username} joined room ${roomId}`);
          break;
        }

        case 'add-element': {
          if (!currentRoomId || !clientInfo) break;

          const room = rooms.get(currentRoomId);
          if (!room) break;

          const element = {
            ...payload.element,
            id: payload.element.id || Math.random().toString(36).substring(2, 10),
            createdBy: clientInfo.userId,
            createdAt: Date.now()
          };

          room.elements.push(element);

          broadcastToRoom(currentRoomId, {
            type: 'element-added',
            payload: { element }
          }, ws);
          break;
        }

        case 'update-element': {
          if (!currentRoomId || !clientInfo) break;

          const room = rooms.get(currentRoomId);
          if (!room) break;

          const elementIndex = room.elements.findIndex(e => e.id === payload.element.id);
          if (elementIndex !== -1) {
            room.elements[elementIndex] = {
              ...room.elements[elementIndex],
              ...payload.element,
              updatedAt: Date.now()
            };

            broadcastToRoom(currentRoomId, {
              type: 'element-updated',
              payload: { element: room.elements[elementIndex] }
            }, ws);
          }
          break;
        }

        case 'delete-element': {
          if (!currentRoomId || !clientInfo) break;

          const room = rooms.get(currentRoomId);
          if (!room) break;

          room.elements = room.elements.filter(e => e.id !== payload.elementId);

          broadcastToRoom(currentRoomId, {
            type: 'element-deleted',
            payload: { elementId: payload.elementId }
          }, ws);
          break;
        }

        case 'cursor-move': {
          if (!currentRoomId || !clientInfo) break;

          clientInfo.cursor = payload.cursor;

          broadcastToRoom(currentRoomId, {
            type: 'cursor-updated',
            payload: {
              userId: clientInfo.userId,
              username: clientInfo.username,
              color: clientInfo.color,
              cursor: payload.cursor
            }
          }, ws);
          break;
        }

        case 'clear-canvas': {
          if (!currentRoomId || !clientInfo) break;

          const room = rooms.get(currentRoomId);
          if (!room) break;

          room.elements = [];

          broadcastToRoom(currentRoomId, {
            type: 'canvas-cleared',
            payload: { clearedBy: clientInfo.userId }
          }, ws);
          break;
        }

        case 'save-state': {
          if (!currentRoomId) break;

          const room = rooms.get(currentRoomId);
          if (!room) break;

          // State is already saved in memory, just confirm
          ws.send(JSON.stringify({
            type: 'state-saved',
            payload: {
              roomId: currentRoomId,
              elementCount: room.elements.length,
              savedAt: Date.now()
            }
          }));
          break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && clientInfo) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.clients.delete(ws);

        broadcastToRoom(currentRoomId, {
          type: 'user-left',
          payload: {
            userId: clientInfo.userId,
            username: clientInfo.username
          }
        });

        // Clean up empty rooms
        if (room.clients.size === 0) {
          rooms.delete(currentRoomId);
          console.log(`Room ${currentRoomId} deleted (empty)`);
        }
      }
    }
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

wss.on('listening', () => {
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});
