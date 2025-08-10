# N8N Webhook Integration Setup

## Overview
This document explains how to integrate your React app's Account Scraper with your n8n workflow using webhooks.

## Current Setup
Your React app now has:
- ✅ Account Scraper UI that can trigger scraping
- ✅ N8N service to communicate with n8n
- ✅ Backend API endpoints to receive results
- ✅ Real-time status updates and progress tracking

## What You Need to Do in N8N

### 1. Add Webhook Trigger Node
In your existing n8n workflow, add a **Webhook** node at the beginning:

```
[Webhook Trigger] → [Your Existing Scraping Nodes] → [Transcripts1 Node]
```

### 2. Configure the Webhook Node
- **Node Name**: `Account Scraper Webhook`
- **HTTP Method**: `POST`
- **Path**: `/account-scraper` (or whatever you prefer)
- **Response Mode**: `Response Node`
- **Options**: 
  - Enable "Respond with all data"
  - Set "Response Code" to `200`

### 3. Connect Webhook to Your Workflow
- Connect the **Webhook** node to your first scraping node
- The webhook will receive data from your React app and pass it to your workflow

### 4. Modify Your Workflow to Use Webhook Data
In your scraping nodes, use the webhook data:
- `{{ $json.sessionName }}` - Session name from the form
- `{{ $json.accountNames }}` - Array of account names
- `{{ $json.maxVideos }}` - Maximum videos to scrape
- `{{ $json.userId }}` - User ID for tracking

### 5. Update Transcripts1 Node
Your `Transcripts1` node is already configured to send results back to:
```
https://content-creation-app-vtio.onrender.com/api/scraping-results
```

## Data Flow
1. **User fills form** → React app
2. **React app calls** → n8n webhook
3. **n8n runs workflow** → Scrapes TikTok accounts
4. **n8n sends results** → Your Render app API
5. **React app displays** → Results to user

## Environment Variables
Set these in your React app:
```bash
REACT_APP_N8N_WEBHOOK_URL=http://your-n8n-url:5678/webhook/account-scraper
REACT_APP_API_URL=https://content-creation-app-vtio.onrender.com
```

## Testing the Integration
1. Start your n8n instance
2. Deploy your updated React app to Render
3. Fill out the Account Scraper form
4. Click "Start Scraping"
5. Watch the real-time progress updates
6. See results appear when scraping completes

## Troubleshooting
- Check n8n execution logs for errors
- Verify webhook URL is accessible
- Ensure your Render app can receive POST requests
- Check browser console for frontend errors

## Next Steps
Once this integration works:
1. Add similar integration for Hashtag Scraper
2. Implement database selection in Content Creation
3. Build video idea generation using scraped data
4. Create video output organization system
