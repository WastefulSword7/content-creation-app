import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';


interface ScrapingResult {
  id: string;
  videoUrl: string;
  videoTitle: string;
  text?: string;
  transcript?: string;
  coverUrl?: string;
  accountName?: string;
  hashtags?: string[];
  subtitleLanguage?: string;
}

interface ScrapingSession {
  id: string;
  name: string;
  type: string;
  userId: string;
  timestamp: string;
  results: ScrapingResult[];
  totalVideos: number;
  status: string;
  metadata: {
    accountNames: string[];
    maxVideos: number;
  };
}

const DatabaseManager: React.FC = () => {
  const [sessions, setSessions] = useState<ScrapingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<ScrapingSession | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ScrapingSession | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scraping-results');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSession = (session: ScrapingSession) => {
    setEditingSession({ ...session });
    setEditDialogOpen(true);
  };

  const handleSaveSession = async () => {
    if (!editingSession) return;

    try {
      const response = await fetch(`/api/scraping-results/${editingSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingSession),
      });

      if (!response.ok) {
        throw new Error('Failed to update session');
      }

      setSessions(sessions.map(s => 
        s.id === editingSession.id ? editingSession : s
      ));
      setEditDialogOpen(false);
      setEditingSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const response = await fetch(`/api/scraping-results/${sessionToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      setSessions(sessions.filter(s => s.id !== sessionToDelete.id));
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Database Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Manage all your saved scraping sessions and their results
      </Typography>

      {sessions.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">
            No scraping sessions found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start by running a scraper to create your first database
          </Typography>
        </Box>
      ) : (
        <Box display="grid" gap={3} gridTemplateColumns="repeat(auto-fill, minmax(400px, 1fr))">
          {sessions.map((session) => (
            <Card key={session.id} elevation={2}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" component="h3">
                    {session.name}
                  </Typography>
                  <Chip 
                    label={session.status.replace('_', ' ')} 
                    color={getStatusColor(session.status) as any}
                    size="small"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Type:</strong> {session.type === 'account' ? 'Account Scraper' : 'Hashtag Scraper'}
                  </Typography>
                  
                  {session.metadata.accountNames.length > 0 && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Accounts:</strong> {session.metadata.accountNames.join(', ')}
                    </Typography>
                  )}
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Max Videos:</strong> {session.metadata.maxVideos}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Results:</strong> {session.totalVideos} videos
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Created:</strong> {formatDate(session.timestamp)}
                  </Typography>
                </Box>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">View Results ({session.results.length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {session.results.map((result, index) => (
                        <React.Fragment key={result.id || index}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box>
                                  <Typography variant="body2" component="span" fontWeight="bold">
                                    Video {index + 1}:
                                  </Typography>
                                  <Typography variant="body2" component="span" ml={1}>
                                    {result.videoTitle || 'No title'}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box mt={1}>
                                  {result.text && (
                                    <Box mb={1}>
                                      <Typography variant="caption" color="text.secondary">
                                        Caption:
                                      </Typography>
                                      <Box display="flex" alignItems="center" gap={1}>
                                        <Typography variant="body2" sx={{ flex: 1 }}>
                                          {result.text.length > 100 
                                            ? `${result.text.substring(0, 100)}...` 
                                            : result.text
                                          }
                                        </Typography>
                                        <IconButton 
                                          size="small" 
                                          onClick={() => copyToClipboard(result.text!)}
                                        >
                                          <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </Box>
                                  )}
                                  
                                  {result.transcript && (
                                    <Box mb={1}>
                                      <Typography variant="caption" color="text.secondary">
                                        Transcript:
                                      </Typography>
                                      <Box display="flex" alignItems="center" gap={1}>
                                        <Typography variant="body2" sx={{ flex: 1 }}>
                                          {result.transcript.length > 100 
                                            ? `${result.transcript.substring(0, 100)}...` 
                                            : result.transcript
                                          }
                                        </Typography>
                                        <IconButton 
                                          size="small" 
                                          onClick={() => copyToClipboard(result.transcript!)}
                                        >
                                          <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </Box>
                                  )}
                                  
                                  {result.subtitleLanguage && (
                                    <Typography variant="caption" color="text.secondary">
                                      Subtitle Language: {result.subtitleLanguage}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < session.results.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleEditSession(session)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    setSessionToDelete(session);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Session</DialogTitle>
        <DialogContent>
          {editingSession && (
            <Box display="grid" gap={2} mt={1}>
              <TextField
                label="Session Name"
                value={editingSession.name}
                onChange={(e) => setEditingSession({
                  ...editingSession,
                  name: e.target.value
                })}
                fullWidth
              />
              
              <TextField
                label="Max Videos"
                type="number"
                value={editingSession.metadata.maxVideos}
                onChange={(e) => setEditingSession({
                  ...editingSession,
                  metadata: {
                    ...editingSession.metadata,
                    maxVideos: parseInt(e.target.value) || 0
                  }
                })}
                fullWidth
              />
              
              {editingSession.metadata.accountNames.length > 0 && (
                <TextField
                  label="Account Names (comma-separated)"
                  value={editingSession.metadata.accountNames.join(', ')}
                  onChange={(e) => setEditingSession({
                    ...editingSession,
                    metadata: {
                      ...editingSession.metadata,
                      accountNames: e.target.value.split(',').map(name => name.trim()).filter(Boolean)
                    }
                  })}
                  fullWidth
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button onClick={handleSaveSession} startIcon={<SaveIcon />} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{sessionToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteSession} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseManager;
