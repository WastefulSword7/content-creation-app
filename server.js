import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
    // Store the scraping results
    const sessionId = `session_${Date.now()}`;
    const sessionData = {
      id: sessionId,
      timestamp: new Date().toISOString(),
      results: req.body,
      totalVideos: req.body.length,
      status: 'completed'
    };
    
    scrapingSessions.push(sessionData);
    scrapingResults = [...scrapingResults, ...req.body];
    
    console.log(`Stored ${req.body.length} videos in session ${sessionId}`);
    
    // Send immediate response to prevent hanging
    res.status(200).json({
      success: true,
      message: 'Scraping results received successfully',
      sessionId: sessionId,
      totalVideos: req.body.length,
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
