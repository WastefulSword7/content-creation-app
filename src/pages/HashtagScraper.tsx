import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Card,
  CardContent,
  IconButton,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../contexts/AuthContext';
import type { ScrapingSession } from '../utils/storage';
import { loadScrapingSessions, saveScrapingSessions } from '../utils/storage';
import n8nService from '../services/n8nService';

const HashtagScraper: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ScrapingSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [hashtags, setHashtags] = useState('');
  const [maxVideos, setMaxVideos] = useState('10');
  const [sessionName, setSessionName] = useState('');

  // Load existing sessions
  useEffect(() => {
    if (!user) return;
    
    const savedSessions = loadScrapingSessions(user.id);
    setSessions(savedSessions);
  }, [user]);

  // Save sessions when they change
  useEffect(() => {
    if (!user) return;
    
    saveScrapingSessions(user.id, sessions);
  }, [sessions, user]);

  const handleStartScraping = async () => {
    if (!hashtags.trim() || !sessionName.trim()) {
      setError('Please provide both hashtags and a session name.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const hashtagList = hashtags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      // Create a new session with pending status
      const newSession: ScrapingSession = {
        id: `session_${user!.id}_${sessionName.trim().replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: sessionName.trim(),
        type: 'hashtag',
        data: [],
        dateCreated: new Date().toISOString(),
        status: 'pending'
      };

      // Add the session immediately to show progress
      setSessions(prev => [...prev, newSession]);

      // Trigger the n8n workflow
      console.log('Triggering n8n hashtag workflow with:', {
        sessionName: sessionName.trim(),
        hashtags: hashtagList,
        maxVideos: parseInt(maxVideos),
        userId: user!.id
      });
      
      const result = await n8nService.triggerHashtagScraping({
        sessionName: sessionName.trim(),
        hashtags: hashtagList,
        maxVideos: parseInt(maxVideos),
        userId: user!.id,
        type: 'hashtag'
      });

      console.log('n8n hashtag workflow triggered successfully:', result);

      // Update session with execution ID and status
      setSessions(prev => prev.map(session => 
        session.id === newSession.id 
          ? { ...session, status: 'in_progress', n8nExecutionId: result.executionId }
          : session
      ));

      setSuccess(`Hashtag scraping started! Execution ID: ${result.executionId}. Results will appear here when complete.`);
      
      // Reset form
      setHashtags('');
      setMaxVideos('10');
      setSessionName('');

      // Start polling for results
      pollForResults(newSession.id, result.executionId);
    } catch (err) {
      console.error('Hashtag scraping error:', err);
      setError('Failed to start scraping process. Please try again.');
      setSessions(prev => prev.filter(session => session.status === 'pending')); // Remove failed session
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for results from n8n
  const pollForResults = async (sessionId: string, executionId: string) => {
    console.log(`Starting to poll for results. Session ID: ${sessionId}, Execution ID: ${executionId}`);
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      console.log(`Polling attempt ${attempts + 1}/${maxAttempts} for session ${sessionId}`);
      
      if (attempts >= maxAttempts) {
        console.log(`Max polling attempts reached for session ${sessionId}`);
        setSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, status: 'failed' }
            : session
        ));
        setError('Scraping timed out after 5 minutes. Please try again.');
        return;
      }

      try {
        // Check if we have results from the callback
        console.log(`Checking for results with session ID: ${sessionId}`);
        const results = await n8nService.getScrapingResults(sessionId);
        console.log(`Results check returned:`, results);
        
        if (results && results.length > 0) {
          console.log(`Found ${results.length} results for session ${sessionId}`);
          // Update session with results
          setSessions(prev => prev.map(session => 
            session.id === sessionId 
              ? { ...session, data: results, status: 'completed' }
              : session
          ));
          setSuccess(`Hashtag scraping completed! Found ${results.length} videos.`);
          return;
        }

        // Check n8n execution status
        console.log(`Checking n8n execution status for: ${executionId}`);
        const status = await n8nService.checkScrapingStatus(executionId);
        console.log(`n8n status check returned:`, status);
        
        if (status.status === 'completed') {
          console.log(`n8n execution completed, checking for final results`);
          // Try to get results again
          const finalResults = await n8nService.getScrapingResults(sessionId);
          if (finalResults && finalResults.length > 0) {
            console.log(`Found ${finalResults.length} final results for session ${sessionId}`);
            setSessions(prev => prev.map(session => 
              session.id === sessionId 
                ? { ...session, data: finalResults, status: 'completed' }
                : session
            ));
            setSuccess(`Hashtag scraping completed! Found ${finalResults.length} videos.`);
            return;
          }
        }
        
        // Continue polling
        attempts++;
        setTimeout(poll, 5000); // Poll every 5 seconds
        
      } catch (error) {
        console.error(`Error during polling for session ${sessionId}:`, error);
        attempts++;
        setTimeout(poll, 5000); // Continue polling even on error
      }
    };

    // Start polling
    poll();
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  const handleSaveSession = (session: ScrapingSession) => {
    // This would typically save to a file or export the data
    const dataStr = JSON.stringify(session.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.name}_scraped_data.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to access the Hashtag Scraper.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Hashtag Scraper
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Scrape TikTok videos by hashtags to gather content for AI analysis and video generation.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Scraping Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          New Scraping Session
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <TextField
              fullWidth
              label="Session Name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Memecoin Content Analysis"
              helperText="Give your scraping session a descriptive name"
            />
          </Box>
          
          <Box>
            <TextField
              fullWidth
              label="Max Videos to Scrape"
              type="number"
              value={maxVideos}
              onChange={(e) => setMaxVideos(e.target.value)}
              inputProps={{ min: 1, max: 100 }}
              helperText="Number of videos to scrape per hashtag (1-100)"
            />
          </Box>
          
          <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
            <TextField
              fullWidth
              label="Hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="memecoin, crypto, trading, bitcoin"
              helperText="Enter hashtags separated by commas (without # symbol)"
              multiline
              rows={3}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            onClick={handleStartScraping}
            disabled={isLoading || !hashtags.trim() || !sessionName.trim()}
            size="large"
          >
            {isLoading ? 'Scraping...' : 'Start Scraping'}
          </Button>
        </Box>
      </Paper>

      {/* Existing Sessions */}
      <Typography variant="h5" gutterBottom>
        Scraping Sessions
      </Typography>

      {sessions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No scraping sessions yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start your first scraping session to gather TikTok content for analysis
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {sessions.map((session) => (
            <Box key={session.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {session.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Created: {new Date(session.dateCreated).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Videos scraped: {session.data.length}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleSaveSession(session)}
                        title="Export data"
                      >
                        <SaveIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteSession(session.id)}
                        title="Delete session"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Sample videos:
                  </Typography>
                  
                  {session.data.slice(0, 3).map((video: any) => (
                    <Box key={video.id} sx={{ mb: 1, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" noWrap>
                        {video.transcript.substring(0, 50)}...
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Views: {video.views} | Likes: {video.likes}
                      </Typography>
                    </Box>
                  ))}
                  
                  {session.data.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{session.data.length - 3} more videos
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default HashtagScraper;
