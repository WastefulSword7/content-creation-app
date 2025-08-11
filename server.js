import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Check if dist folder exists, if not build the app
const distPath = path.join(__dirname, 'dist');
try {
  await fs.access(distPath);
  console.log('Dist folder found, serving existing build');
} catch (error) {
  console.log('Dist folder not found, building React app...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('React app built successfully');
  } catch (buildError) {
    console.error('Failed to build React app:', buildError);
    process.exit(1);
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'dist')));

// Data storage (in production, use a database)
let scrapingResults = [];
let scrapingSessions = [];

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API endpoint to receive scraping results from n8n
app.post('/api/scraping-results', (req, res) => {
  console.log('=== SCRAPING RESULTS RECEIVED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Extract session info from the request
    const { sessionName, accountNames, maxVideos, userId, results } = req.body;
    
    // Create a session ID based on the request data
    const sessionId = `session_${userId}_${Date.now()}`;
    
    // Process the results - handle both array and object formats
    let processedResults = results;
    if (Array.isArray(req.body)) {
      // If the body is directly an array of results
      processedResults = req.body;
    } else if (results && Array.isArray(results)) {
      // If results are nested in the body
      processedResults = results;
    } else {
      // Fallback: treat the entire body as results
      processedResults = [req.body];
    }
    
    const sessionData = {
      id: sessionId,
      name: sessionName || `Scraping Session ${new Date().toLocaleString()}`,
      type: 'account',
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
      results: processedResults,
      totalVideos: processedResults.length,
      status: 'completed',
      metadata: {
        accountNames: accountNames || [],
        maxVideos: maxVideos || processedResults.length
      }
    };
    
    scrapingSessions.push(sessionData);
    scrapingResults = [...scrapingResults, ...processedResults];
    
    console.log(`Stored ${processedResults.length} videos in session ${sessionId}`);
    console.log('Session data:', JSON.stringify(sessionData, null, 2));
    
    // Send immediate response to prevent hanging
    res.status(200).json({
      success: true,
      message: 'Scraping results received successfully',
      sessionId: sessionId,
      totalVideos: processedResults.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error processing scraping results:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// API endpoint to get all scraping sessions
app.get('/api/scraping-sessions', (req, res) => {
  res.json({
    success: true,
    sessions: scrapingSessions,
    totalSessions: scrapingSessions.length
  });
});

// API endpoint to get a specific scraping session
app.get('/api/scraping-sessions/:sessionId', (req, res) => {
  const session = scrapingSessions.find(s => s.id === req.params.sessionId);
  if (session) {
    res.json({
      success: true,
      session: session
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }
});

// API endpoint to get results by session ID
app.get('/api/results/:sessionId', (req, res) => {
  const session = scrapingSessions.find(s => s.id === req.params.sessionId);
  if (session) {
    res.json(session.results);
  } else {
    res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }
});

// API endpoint to get all results
app.get('/api/results', (req, res) => {
  res.json({
    success: true,
    results: scrapingResults,
    totalResults: scrapingResults.length
  });
});

// Proxy endpoint to forward requests to n8n (solves CORS issue)
// Last updated: 2025-01-27 - Added detailed error logging
app.post('/api/n8n-proxy', async (req, res) => {
  try {
    console.log('=== N8N PROXY REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Forwarding request to n8n webhook...');
    
    const n8nWebhookUrl = 'https://cartergerhardt.app.n8n.cloud/webhook-test/account-scraper';
    console.log('Target URL:', n8nWebhookUrl);
    
    const response = await axios.post(n8nWebhookUrl, req.body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('n8n response status:', response.status);
    console.log('n8n response data:', response.data);
    
    if (response.status !== 200) {
      throw new Error(`n8n responded with status: ${response.status}`);
    }
    
    const result = response.data;
    console.log('n8n response:', result);
    
    res.json({
      success: true,
      message: 'Request forwarded to n8n successfully',
      n8nResponse: result,
      executionId: result.executionId || Date.now().toString()
    });
    
  } catch (error) {
    console.error('=== N8N PROXY ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to forward request to n8n',
      error: error.message,
      details: error.toString()
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    totalSessions: scrapingSessions.length,
    totalResults: scrapingResults.length
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Test n8n proxy endpoint
app.get('/api/n8n-proxy-test', (req, res) => {
  res.json({
    success: true,
    message: 'n8n proxy endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler: send back React's index.html file for any non-API routes
// This is needed for React Router to work properly
app.get('*', (req, res) => {
  // Don't interfere with API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Serve the React app for all other routes
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: /api/scraping-results`);
  console.log(`Sessions endpoint: /api/scraping-sessions`);
  console.log(`Results endpoint: /api/results`);
  console.log(`Static files served from: ${path.join(__dirname, 'dist')}`);
});
