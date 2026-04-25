# Services

This directory contains backend services for the application.

## Available Services

### 1. Collaboration Service (`collab-service.js`)
A WebSocket server for real-time collaboration features.

**To start:**
```bash
npm run dev
```

**Configuration:**
- Port: 8080 (default)
- Runs a WebSocket server for collaborative drawing/editing

### 2. Keep-Alive Cron Job (`cron-keep-alive.js`)
A script to keep the Supabase database active by periodically accessing the web application.

**To run manually:**
```bash
npm run cron
```

**Environment Variables:**
- `WEB_APP_URL`: Your deployed web app URL (e.g., `https://www.justaquib.com`)
- `ADMIN_EMAIL`: Admin email for authentication (optional)
- `ADMIN_PASSWORD`: Admin password for authentication (optional)

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **For development (WebSocket server):**
   ```bash
   npm run dev
   ```

3. **For cron job testing:**
   ```bash
   WEB_APP_URL=https://your-app-url.com npm run cron
   ```

## Deployment

### Collaboration Service
- Deploy as a background service/web service
- Ensure port 8080 is available
- Use `npm run dev` as start command

### Keep-Alive Cron Job
- Can be deployed to any cron service (Render.com, GitHub Actions, etc.)
- Schedule: Every 6 hours (`0 */6 * * *`)
- Ensure `WEB_APP_URL` environment variable is set

## How the Keep-Alive Works

The cron job performs these steps periodically:

1. **Access Homepage**: Makes a request to wake up the web application
2. **Access Dashboard**: Attempts to access the dashboard (triggers authentication flow)
3. **Call Keep-Alive API**: Calls the `/api/cron/keep-alive` endpoint if available
4. **Access Public APIs**: Makes requests to public API endpoints that access the database

This ensures your Supabase database remains active and doesn't go to sleep due to inactivity.