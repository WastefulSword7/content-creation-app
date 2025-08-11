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

// API endpoint to trigger n8n workflow
app.post('/api/trigger-scraping', async (req, res) => {
  console.log('=== TRIGGERING SCRAPING WORKFLOW ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { sessionName, accountNames, maxVideos, userId } = req.body;
    
    // Validate required fields
    if (!sessionName || !accountNames || !maxVideos || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionName, accountNames, maxVideos, userId'
      });
    }
    
    // Create a unique session ID
    const sessionId = `session_${userId}_${Date.now()}`;
    
    // Store the pending session
    const pendingSession = {
      id: sessionId,
      name: sessionName,
      type: 'account',
      userId: userId,
      timestamp: new Date().toISOString(),
      results: [],
      totalVideos: 0,
      status: 'pending',
      metadata: {
        accountNames: Array.isArray(accountNames) ? accountNames : [accountNames],
        maxVideos: parseInt(maxVideos)
      }
    };
    
    scrapingSessions.push(pendingSession);
    
    // Forward the request to your n8n workflow
    // You'll need to update this URL to match your actual n8n webhook URL
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/account-scraper';
    
    const n8nResponse = await axios.post(n8nWebhookUrl, {
      sessionName,
      accountNames: Array.isArray(accountNames) ? accountNames : [accountNames],
      maxVideos: parseInt(maxVideos),
      userId,
      sessionId,
      callbackUrl: `${req.protocol}://${req.get('host')}/api/scraping-results`,
      timestamp: new Date().toISOString()
    });
    
    const n8nResult = n8nResponse.data;
    
    // Update session status to in_progress
    const sessionIndex = scrapingSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      scrapingSessions[sessionIndex].status = 'in_progress';
      scrapingSessions[sessionIndex].n8nExecutionId = n8nResult.executionId || Date.now().toString();
    }
    
    console.log(`Scraping workflow triggered successfully for session ${sessionId}`);
    
    res.status(200).json({
      success: true,
      message: 'Scraping workflow triggered successfully',
      sessionId: sessionId,
      executionId: n8nResult.executionId || Date.now().toString(),
      status: 'in_progress',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error triggering scraping workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger scraping workflow',
      error: error.message
    });
  }
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
