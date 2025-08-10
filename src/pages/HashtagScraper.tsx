import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../contexts/AuthContext';
import type { ScrapingSession } from '../utils/storage';
import { loadScrapingSessions, saveScrapingSessions } from '../utils/storage';

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
      // Simulate scraping process (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 3000));

      const hashtagList = hashtags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const newSession: ScrapingSession = {
        id: Date.now().toString(),
        name: sessionName.trim(),
        type: 'hashtag',
        data: [
          // Mock scraped data - replace with actual scraped content
          {
            id: '1',
            hashtag: hashtagList[0],
            videoUrl: 'https://example.com/video1.mp4',
            transcript: 'Sample transcript for video 1',
            caption: 'Sample caption for video 1',
            views: 1000,
            likes: 100
          },
          {
            id: '2', 
            hashtag: hashtagList[0],
            videoUrl: 'https://example.com/video2.mp4',
            transcript: 'Sample transcript for video 2',
            caption: 'Sample caption for video 2',
            views: 2000,
            likes: 200
          }
        ],
        dateCreated: new Date().toISOString()
      };

      setSessions(prev => [...prev, newSession]);
      setSuccess(`Successfully scraped ${newSession.data.length} videos for hashtags: ${hashtagList.join(', ')}`);
      
      // Reset form
      setHashtags('');
      setMaxVideos('10');
      setSessionName('');
    } catch (err) {
      setError('Failed to scrape videos. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Session Name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Memecoin Content Analysis"
              helperText="Give your scraping session a descriptive name"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Max Videos to Scrape"
              type="number"
              value={maxVideos}
              onChange={(e) => setMaxVideos(e.target.value)}
              inputProps={{ min: 1, max: 100 }}
              helperText="Number of videos to scrape per hashtag (1-100)"
            />
          </Grid>
          
          <Grid item xs={12}>
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
          </Grid>
        </Grid>

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
        <Grid container spacing={3}>
          {sessions.map((session) => (
            <Grid item xs={12} md={6} key={session.id}>
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
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default HashtagScraper;
