# n8n Webhook Setup for Account Scraper

## 🎯 Overview
Your React app now sends scraping requests to your backend server, which then forwards them to n8n. This creates a clean separation and allows for better error handling and session management.

## 🔧 Setup Steps

### 1. Add Webhook Trigger Node
In your n8n workflow (`Real Web Engine.json`):

1. **Add a new "Webhook" node** at the beginning of your workflow
2. **Configure the webhook:**
   - **HTTP Method**: POST
   - **Path**: `/webhook/account-scraper` (or whatever you prefer)
   - **Response Mode**: Respond to Webhook
   - **Response Code**: 200

### 2. Connect the Webhook
- Connect the **Webhook** node to your existing workflow
- The webhook will receive data from your backend server

### 3. Use Webhook Data in Your Workflow
The webhook will receive this data structure:
```json
{
  "sessionName": "My Scraping Session",
  "accountNames": ["account1", "account2"],
  "maxVideos": 10,
  "userId": "user123",
  "sessionId": "session_user123_1234567890",
  "callbackUrl": "https://your-app.onrender.com/api/scraping-results",
  "timestamp": "2025-08-10T22:30:00.000Z"
}
```

### 4. Update Your Transcripts1 Node
Make sure your `Transcripts1` node still posts to:
```
https://content-creation-app-vtio.onrender.com/api/scraping-results
```

### 5. Set Environment Variables
In your Render app, set these environment variables:
- `N8N_WEBHOOK_URL`: Your n8n webhook URL (e.g., `http://localhost:5678/webhook/account-scraper` for local testing)

## 🔄 How It Works Now

1. **User clicks "Start Scraping"** on the Account Scraper page
2. **Frontend sends request** to your backend at `/api/trigger-scraping`
3. **Backend creates session** and forwards request to n8n webhook
4. **n8n executes workflow** using the provided data
5. **n8n sends results** back to your backend at `/api/scraping-results`
6. **Frontend polls for results** and updates the UI

## 🧪 Testing

1. **Start your backend server**: `npm run server`
2. **Start your frontend**: `npm run dev`
3. **Set up n8n webhook** as described above
4. **Test the flow** by clicking "Start Scraping" on the Account Scraper page

## 🚨 Troubleshooting

- **Check backend logs** for webhook forwarding errors
- **Verify n8n webhook URL** is accessible from your backend
- **Ensure n8n workflow** is active and connected properly
- **Check browser console** for frontend errors

## 📝 Notes

- The backend now handles session creation and management
- Results are stored locally until you implement a database
- The webhook approach is more reliable than manual execution
- You can easily add authentication and rate limiting later
