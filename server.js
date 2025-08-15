import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute

// Rate limiting middleware
const rateLimit = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    const clientData = requestCounts.get(clientIP);
    
    if (now > clientData.resetTime) {
      // Reset window
      clientData.count = 1;
      clientData.resetTime = now + RATE_LIMIT_WINDOW;
    } else if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
      // Rate limit exceeded
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    } else {
      clientData.count++;
    }
  }
  
  next();
};

// Apply rate limiting to all routes
app.use(rateLimit);

// Check if dist folder exists, if not exit gracefully
const distPath = path.join(__dirname, 'dist');
try {
  await fs.access(distPath);
  console.log('Dist folder found, serving existing build');
} catch (error) {
  console.log('Dist folder not found. This app requires a pre-built React app.');
  console.log('Please ensure the dist folder is included in your deployment.');
  console.log('For Render deployment, the build should happen during the build phase, not runtime.');
  process.exit(1);
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
// Force redeploy: 2025-01-27 - Added error handling and debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API endpoint to receive scraping results from n8n
app.post('/api/scraping-results', async (req, res) => {
  try {
    console.log('=== SCRAPING RESULTS RECEIVED ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Input validation
    const { sessionName, accountNames, maxVideos, userId, results } = req.body;
    
    // Check for required fields
    if (!sessionName || !accountNames || !results) {
      console.error('Missing required fields:', { sessionName, accountNames, results });
      return res.status(422).json({
        success: false,
        message: 'Missing required fields: sessionName, accountNames, and results are required'
      });
    }
    
    // Validate data types and sizes
    if (typeof sessionName !== 'string' || sessionName.trim().length === 0) {
      return res.status(422).json({
        success: false,
        message: 'sessionName must be a non-empty string'
      });
    }
    
    if (!Array.isArray(accountNames) || accountNames.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'accountNames must be a non-empty array'
      });
    }
    
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'results must be a non-empty array'
      });
    }
    
    // Check payload size (limit to 10MB)
    const payloadSize = JSON.stringify(req.body).length;
    const maxPayloadSize = 10 * 1024 * 1024; // 10MB
    if (payloadSize > maxPayloadSize) {
      console.error('Payload too large:', payloadSize, 'bytes');
      return res.status(413).json({
        success: false,
        message: 'Payload too large. Maximum size is 10MB'
      });
    }
    
    // Validate maxVideos if provided
    if (maxVideos !== undefined) {
      if (typeof maxVideos !== 'number' || maxVideos < 1 || maxVideos > 1000) {
        return res.status(422).json({
          success: false,
          message: 'maxVideos must be a number between 1 and 1000'
        });
      }
    }
    
    // Validate userId if provided
    if (userId !== undefined && (typeof userId !== 'string' || userId.trim().length === 0)) {
      return res.status(422).json({
        success: false,
        message: 'userId must be a non-empty string if provided'
      });
    }
    
    console.log('Input validation passed');
    
    // Process the results (existing logic)
    const processedResults = results.flatMap(item => {
      if (item.results && Array.isArray(item.results)) {
        return item.results;
      }
      return item;
    });
    
    console.log(`Flattening nested results array`);
    console.log(`Processed ${processedResults.length} results`);
    
    // Create session ID
    const sessionId = `session_${userId || Date.now()}_${sessionName}`;
    
    // Create session data
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
    
    // Check if session already exists and update it, otherwise create new
    const existingSessionIndex = scrapingSessions.findIndex(s => s.id === sessionId);
    if (existingSessionIndex >= 0) {
      scrapingSessions[existingSessionIndex] = sessionData;
      console.log(`Updated existing session ${sessionId}`);
    } else {
      scrapingSessions.push(sessionData);
      console.log(`Created new session ${sessionId}`);
    }
    
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
    
    // Input validation
    if (!req.body || typeof req.body !== 'object') {
      console.error('Invalid request body');
      return res.status(422).json({
        success: false,
        message: 'Request body must be a valid JSON object'
      });
    }
    
    // Check payload size (limit to 5MB for n8n requests)
    const payloadSize = JSON.stringify(req.body).length;
    const maxPayloadSize = 5 * 1024 * 1024; // 5MB
    if (payloadSize > maxPayloadSize) {
      console.error('Payload too large:', payloadSize, 'bytes');
      return res.status(413).json({
        success: false,
        message: 'Payload too large. Maximum size is 5MB'
      });
    }
    
    // Validate required fields for account scraper
    if (!req.body.accountNames && !req.body.hashtags) {
      return res.status(422).json({
        success: false,
        message: 'Either accountNames or hashtags must be provided'
      });
    }
    
    // Validate accountNames if provided
    if (req.body.accountNames) {
      if (!Array.isArray(req.body.accountNames) || req.body.accountNames.length === 0) {
        return res.status(422).json({
          success: false,
          message: 'accountNames must be a non-empty array'
        });
      }
      
      // Validate each account name
      for (const account of req.body.accountNames) {
        if (typeof account !== 'string' || account.trim().length === 0) {
          return res.status(422).json({
            success: false,
            message: 'Each account name must be a non-empty string'
          });
        }
      }
    }
    
    // Validate hashtags if provided
    if (req.body.hashtags) {
      if (!Array.isArray(req.body.hashtags) || req.body.hashtags.length === 0) {
        return res.status(422).json({
          success: false,
          message: 'hashtags must be a non-empty array'
        });
      }
      
      // Validate each hashtag
      for (const hashtag of req.body.hashtags) {
        if (typeof hashtag !== 'string' || hashtag.trim().length === 0) {
          return res.status(422).json({
            success: false,
            message: 'Each hashtag must be a non-empty string'
          });
        }
      }
    }
    
    // Validate maxVideos if provided
    if (req.body.maxVideos !== undefined) {
      if (typeof req.body.maxVideos !== 'number' || req.body.maxVideos < 1 || req.body.maxVideos > 1000) {
        return res.status(422).json({
          success: false,
          message: 'maxVideos must be a number between 1 and 1000'
        });
      }
    }
    
    // Validate sessionName if provided
    if (req.body.sessionName !== undefined) {
      if (typeof req.body.sessionName !== 'string' || req.body.sessionName.trim().length === 0) {
        return res.status(422).json({
          success: false,
          message: 'sessionName must be a non-empty string if provided'
        });
      }
    }
    
    console.log('Input validation passed');
    console.log('Forwarding request to n8n webhook...');
    
    // Determine which webhook to use based on request type
    let n8nWebhookUrl;
    if (req.body.hashtags) {
      n8nWebhookUrl = 'https://cartergerhardt.app.n8n.cloud/webhook-test/hashtag-scraper';
      console.log('Using hashtag scraper test webhook');
    } else {
      n8nWebhookUrl = 'https://cartergerhardt.app.n8n.cloud/webhook/account-scraper';
      console.log('Using account scraper production webhook');
    }
    
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

// Proxy endpoint for sessions API (solves CORS issue)
app.get('/api/sessions-proxy', (req, res) => {
  try {
    console.log('=== SESSIONS PROXY REQUEST ===');
    
    // Return the sessions data through our proxy
    res.json({
      success: true,
      sessions: scrapingSessions,
      totalSessions: scrapingSessions.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('=== SESSIONS PROXY ERROR ===');
    console.error('Error details:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get sessions',
      error: error.message
    });
  }
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
