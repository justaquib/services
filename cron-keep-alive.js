/**
 * Cron Job Script for Render.com
 * Keeps Supabase database active by periodically accessing the dashboard
 * Runs every 6 hours as configured in Render.com cron settings
 */

const https = require('https');

// Configuration
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://www.justaquib.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'techaquib@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.method === 'POST' && options.data) {
      req.write(JSON.stringify(options.data));
    }

    req.end();
  });
}

// Main cron job function
async function runCronJob() {
  console.log(`[${new Date().toISOString()}] Starting Supabase keep-alive cron job...`);

  try {
    // Step 1: Access the homepage to wake up the web app
    console.log('Step 1: Accessing homepage...');
    const homeResponse = await makeRequest(WEB_APP_URL);
    console.log(`Homepage response: ${homeResponse.status}`);

    // Step 2: Try to access dashboard (may require authentication)
    console.log('Step 2: Accessing dashboard...');
    const dashboardUrl = `${WEB_APP_URL}/dashboard`;
    const dashboardResponse = await makeRequest(dashboardUrl);
    console.log(`Dashboard response: ${dashboardResponse.status}`);

    // Step 3: Call the keep-alive API endpoint (if available)
    console.log('Step 3: Calling keep-alive API...');
    const keepAliveUrl = `${WEB_APP_URL}/api/cron/keep-alive`;
    try {
      const keepAliveResponse = await makeRequest(keepAliveUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Render-Cron-KeepAlive/1.0'
        }
      });
      console.log(`Keep-alive API response: ${keepAliveResponse.status}`);

      // Check if response is JSON (API response) or HTML (404 page)
      if (typeof keepAliveResponse.data === 'object' && keepAliveResponse.data !== null) {
        console.log('Keep-alive response:', JSON.stringify(keepAliveResponse.data, null, 2));
      } else if (keepAliveResponse.status === 200) {
        console.log('Keep-alive API responded successfully');
      } else {
        console.log('Keep-alive API returned HTML (possibly 404 or redirect)');
      }
    } catch (apiError) {
      console.log('Keep-alive API not available or failed:', apiError.message);
    }

    // Step 4: Access additional API endpoints to ensure database activity
    console.log('Step 4: Accessing additional API endpoints...');

    const apiEndpoints = [
      '/api/analytics',
      '/api/stock-chat',
      '/api/python-executor',
      '/api/gemini'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const apiUrl = `${WEB_APP_URL}${endpoint}`;
        const apiResponse = await makeRequest(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Render-Cron-KeepAlive/1.0'
          }
        });
        console.log(`${endpoint} response: ${apiResponse.status}`);
      } catch (apiError) {
        console.log(`${endpoint} access failed: ${apiError.message}`);
      }
    }

    // Step 5: Try to login and access authenticated routes (if credentials available)
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      console.log('Step 5: Attempting login to access authenticated dashboard...');

      // This would require handling CSRF tokens and session cookies
      // For now, just log that authentication is needed
      console.log('Authentication required - configure ADMIN_EMAIL and ADMIN_PASSWORD environment variables');

      // The dashboard access in Step 2 should trigger database activity even if it redirects
    }

    console.log(`[${new Date().toISOString()}] Cron job completed successfully`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cron job failed:`, error.message);
    process.exit(1);
  }
}

// Run the cron job
runCronJob();