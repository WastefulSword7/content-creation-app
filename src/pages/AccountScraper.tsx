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
  Divider,
  LinearProgress,
  Chip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../contexts/AuthContext';
import type { ScrapingSession } from '../services/n8nService';
import n8nService from '../services/n8nService';

const AccountScraper: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ScrapingSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [accountNames, setAccountNames] = useState('');
  const [maxVideos, setMaxVideos] = useState('10');
  const [sessionName, setSessionName] = useState('');

  // Load existing sessions from localStorage (temporary until we have a proper backend)
  useEffect(() => {
    if (!user) return;
    
    const savedSessions = localStorage.getItem(`scraping_sessions_${user.id}`);
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (error) {
        console.error('Failed to parse saved sessions:', error);
      }
    }
  }, [user]);

  // Save sessions when they change
  useEffect(() => {
    if (!user) return;
    
    localStorage.setItem(`scraping_sessions_${user.id}`, JSON.stringify(sessions));
  }, [sessions, user]);

  const handleStartScraping = async () => {
    if (!accountNames.trim() || !sessionName.trim()) {
      setError('Please provide both account names and a session name.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const accountList = accountNames.split(',').map(account => account.trim()).filter(account => account);
      
      // Create a new session with pending status
      // Use the same ID format that the backend will use
      const sessionId = `session_${user!.id}_${sessionName.trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
      const newSession: ScrapingSession = {
        id: sessionId,
        name: sessionName.trim(),
        type: 'account',
        data: [],
        dateCreated: new Date().toISOString(),
        status: 'pending'
      };

      // Add the session immediately to show progress
      setSessions(prev => [...prev, newSession]);

      // Trigger the n8n workflow
      const result = await n8nService.triggerAccountScraping({
        sessionName: sessionName.trim(),
        accountNames: accountList,
        maxVideos: parseInt(maxVideos),
        userId: user!.id
      });

      // Update session with execution ID and status
      setSessions(prev => prev.map(session => 
        session.id === newSession.id 
          ? { ...session, status: 'in_progress', n8nExecutionId: result.executionId }
          : session
      ));

      setSuccess(`Scraping started! Execution ID: ${result.executionId}. Results will appear here when complete.`);
      
      // Reset form
      setAccountNames('');
      setMaxVideos('10');
      setSessionName('');

      // Start polling for results
      pollForResults(newSession.id, result.executionId);
    } catch (err) {
      setError('Failed to start scraping process. Please try again.');
      console.error('Scraping error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for results from n8n
  const pollForResults = async (sessionId: string, executionId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, status: 'failed' }
            : session
        ));
        return;
      }

      try {
        // Check if we have results from the callback
        const results = await n8nService.getScrapingResults(sessionId);
        
        if (results.length > 0) {
          // Update session with results
          setSessions(prev => prev.map(session => 
            session.id === sessionId 
              ? { ...session, data: results, status: 'completed' }
              : session
          ));
          setSuccess(`Scraping completed! Found ${results.length} videos.`);
          return;
        }

        // Check n8n execution status
        const status = await n8nService.checkScrapingStatus(executionId);
        
        if (status.status === 'completed') {
          // Try to get results again
          const finalResults = await n8nService.getScrapingResults(sessionId);
          if (finalResults.length > 0) {
            setSessions(prev => prev.map(session => 
              session.id === sessionId 
                ? { ...session, data: finalResults, status: 'completed' }
                : session
            ));
            setSuccess(`Scraping completed! Found ${finalResults.length} videos.`);
            return;
          }
        } else if (status.status === 'failed') {
          setSessions(prev => prev.map(session => 
            session.id === sessionId 
              ? { ...session, status: 'failed' }
              : session
          ));
          setError('Scraping failed. Please try again.');
          return;
        }

        // Continue polling
        attempts++;
        setTimeout(poll, 5000); // Poll every 5 seconds
      } catch (error) {
        console.error('Polling error:', error);
        attempts++;
        setTimeout(poll, 5000);
      }
    };

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
          Please log in to access the Account Scraper.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Account Scraper
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Scrape TikTok videos from specific accounts to gather content for AI analysis and video generation.
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
              placeholder="e.g., Crypto Influencer Analysis"
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
              helperText="Number of videos to scrape per account (1-100)"
            />
          </Box>
          
          <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
            <TextField
              fullWidth
              label="Account Names"
              value={accountNames}
              onChange={(e) => setAccountNames(e.target.value)}
              placeholder="jdtradez_, luke_trades2, kassidycrypto"
              helperText="Enter TikTok account names separated by commas (without @ symbol)"
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
            disabled={isLoading || !accountNames.trim() || !sessionName.trim()}
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
            Start your first scraping session to gather TikTok content from specific accounts
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip 
                          label={session.status === 'pending' ? 'Pending' : 
                                 session.status === 'in_progress' ? 'In Progress' :
                                 session.status === 'completed' ? 'Completed' :
                                 session.status === 'failed' ? 'Failed' : 'Unknown'}
                          color={session.status === 'pending' ? 'default' :
                                 session.status === 'in_progress' ? 'primary' :
                                 session.status === 'completed' ? 'success' :
                                 session.status === 'failed' ? 'error' : 'default'}
                          size="small"
                        />
                        {session.status === 'in_progress' && <CircularProgress size={16} />}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Videos scraped: {session.data.length}
                      </Typography>
                      {session.n8nExecutionId && (
                        <Typography variant="caption" color="text.secondary">
                          Execution ID: {session.n8nExecutionId}
                        </Typography>
                      )}
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

                  {session.status === 'in_progress' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Scraping in progress...
                      </Typography>
                      <LinearProgress />
                    </Box>
                  )}

                  {session.status === 'completed' && session.data.length > 0 && (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Sample videos:
                      </Typography>
                  
                  {session.data.slice(0, 3).map((video: any) => (
                    <Box key={video.id} sx={{ mb: 1, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" noWrap>
                        {video.transcript.substring(0, 50)}...
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Views: {video.views} | Likes: {video.likes} | Account: {video.account}
                      </Typography>
                    </Box>
                  ))}
                  
                  {session.data.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{session.data.length - 3} more videos
                    </Typography>
                  )}
                </>
                  )}

                  {session.status === 'failed' && (
                    <Typography variant="body2" color="error" gutterBottom>
                      Scraping failed. Please try again.
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

export default AccountScraper;
