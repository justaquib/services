# Render.com Cron Job Setup

This service contains a cron job script to keep your Supabase database active by periodically accessing your web application.

## Setup Instructions

1. **Deploy this service to Render.com**:
   - Create a new Web Service on Render.com
   - Connect your GitHub repository
   - Set the build command: `npm install`
   - Set the start command: `npm run cron`
   - Configure environment variables (see below)

2. **Convert to Cron Job**:
   - After initial deployment, go to your service settings
   - Change the service type from "Web Service" to "Cron Job"
   - Set the schedule to run every 6 hours: `0 */6 * * *`
   - This cron expression runs at minute 0 of every 6th hour

## Environment Variables

Set these environment variables in your Render.com service:

- `WEB_APP_URL`: Your deployed web app URL (e.g., `https://www.justaquib.com`)
- `ADMIN_EMAIL`: Admin email for authentication (optional)
- `ADMIN_PASSWORD`: Admin password for authentication (optional)

## How it works

The cron job performs these steps every 6 hours:

1. **Access Homepage**: Makes a request to wake up the web application
2. **Access Dashboard**: Attempts to access the dashboard (may redirect to login)
3. **Call Keep-Alive API**: Calls the `/api/cron/keep-alive` endpoint if available
4. **Access Public APIs**: Makes requests to public API endpoints that access the database

This ensures your Supabase database remains active and doesn't go to sleep due to inactivity.

## Testing

To test locally:

```bash
cd services
npm run cron
```

Make sure to set the `WEB_APP_URL` environment variable:

```bash
WEB_APP_URL=https://www.justaquib.com npm run cron
```