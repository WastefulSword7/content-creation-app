import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Snackbar,
  MenuItem
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface ScrapingSession {
  id: string;
  name: string;
  type: 'hashtag' | 'account';
  data: any[];
  dateCreated: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  n8nExecutionId?: string;
  metadata?: {
    accountNames?: string[];
    hashtags?: string[];
    maxVideos?: number;
  };
}

const DatabaseManager: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ScrapingSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ScrapingSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<ScrapingSession | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', type: 'account' as 'account' | 'hashtag' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  const [loading, setLoading] = useState(false);

  // Load sessions from backend API
  const loadSessionsFromBackend = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use the proper backend endpoint to get all sessions
      const response = await fetch(`https://content-creation-app-vtio.onrender.com/api/scraping-sessions`);
      if (response.ok) {
        const data = await response.json();
        console.log('Backend sessions response:', data);
        
        if (data.success && data.sessions && Array.isArray(data.sessions)) {
          // Transform backend sessions to match our frontend format
          const transformedSessions: ScrapingSession[] = data.sessions.map((session: any) => ({
            id: session.id,
            name: session.name,
            type: session.type || 'account',
            data: session.results || [],
            dateCreated: session.timestamp || new Date().toISOString(),
            status: session.status || 'completed',
            metadata: {
              accountNames: session.metadata?.accountNames || [],
              maxVideos: session.metadata?.maxVideos || 0
            }
          }));
          
          console.log('Transformed sessions:', transformedSessions);
          setSessions(transformedSessions);
          setFilteredSessions(transformedSessions);
        } else {
          console.log('No sessions found or invalid response format');
          setSessions([]);
          setFilteredSessions([]);
        }
      } else {
        console.error('Failed to fetch sessions:', response.status);
        setSnackbar({
          open: true,
          message: 'Failed to load sessions from backend',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Failed to load sessions from backend:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load sessions from backend',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load sessions on component mount
  useEffect(() => {
    if (user) {
      loadSessionsFromBackend();
    }
  }, [user]);

  // Filter sessions based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSessions(sessions);
    } else {
      const filtered = sessions.filter(session =>
        session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (session.metadata?.accountNames?.some(name => 
          name.toLowerCase().includes(searchTerm.toLowerCase())
        )) ||
        (session.metadata?.hashtags?.some(tag => 
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
      setFilteredSessions(filtered);
    }
    setPage(0); // Reset to first page when filtering
  }, [searchTerm, sessions]);

  const handleEditSession = (session: ScrapingSession) => {
    setSelectedSession(session);
    setEditForm({
      name: session.name,
      type: session.type
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedSession || !user) return;

    const updatedSessions = sessions.map(session =>
      session.id === selectedSession.id
        ? { ...session, name: editForm.name, type: editForm.type }
        : session
    );

    setSessions(updatedSessions);
    // saveScrapingSessions(user.id, updatedSessions); // This line was removed as per the new_code
    setEditDialogOpen(false);
    setSelectedSession(null);
    showSnackbar('Session updated successfully', 'success');
  };

  const handleDeleteSession = (session: ScrapingSession) => {
    setSelectedSession(session);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedSession || !user) return;

    const updatedSessions = sessions.filter(session => session.id !== selectedSession.id);
    setSessions(updatedSessions);
    // saveScrapingSessions(user.id, updatedSessions); // This line was removed as per the new_code
    setDeleteDialogOpen(false);
    setSelectedSession(null);
    showSnackbar('Session deleted successfully', 'success');
  };

  const handleViewSession = (session: ScrapingSession) => {
    setSelectedSession(session);
    setViewDialogOpen(true);
  };

  const handleRefreshSessions = () => {
    if (user) {
      loadSessionsFromBackend();
      showSnackbar('Sessions refreshed', 'info');
    }
  };

  const handleExportSession = (session: ScrapingSession) => {
    const dataStr = JSON.stringify(session, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.name}_${session.type}_data.json`;
    link.click();
    URL.revokeObjectURL(url);
    showSnackbar('Session exported successfully', 'success');
  };

  const handleCopySessionId = (sessionId: string) => {
    navigator.clipboard.writeText(sessionId);
    showSnackbar('Session ID copied to clipboard', 'success');
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
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
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Box sx={{ p: 3, maxWidth: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Database Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage all your scraping sessions and data. View, edit, delete, and export your databases.
      </Typography>

      {/* Search and Actions Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search sessions by name, type, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ minWidth: 300, flexGrow: 1 }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshSessions}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Chip 
            label={`${filteredSessions.length} sessions`} 
            color="primary" 
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Sessions Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Session Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data Items</TableCell>
                <TableCell>Date Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Loading sessions...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? 'No sessions match your search.' : 'No scraping sessions found.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {session.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={session.type} 
                          size="small" 
                          color={session.type === 'account' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusText(session.status)} 
                          size="small" 
                          color={getStatusColor(session.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {session.data?.length || 0} items
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(session.dateCreated)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Data">
                            <IconButton
                              size="small"
                              onClick={() => handleViewSession(session)}
                              color="primary"
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Session">
                            <IconButton
                              size="small"
                              onClick={() => handleEditSession(session)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Export Data">
                            <IconButton
                              size="small"
                              onClick={() => handleExportSession(session)}
                              color="secondary"
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy Session ID">
                            <IconButton
                              size="small"
                              onClick={() => handleCopySessionId(session.id)}
                              color="info"
                            >
                              <CopyIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Session">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteSession(session)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredSessions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Session</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Session Name"
            fullWidth
            variant="outlined"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            margin="dense"
            label="Type"
            fullWidth
            variant="outlined"
            value={editForm.type}
            onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'account' | 'hashtag' })}
          >
            <MenuItem value="account">Account Scraping</MenuItem>
            <MenuItem value="hashtag">Hashtag Scraping</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Session</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedSession?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Session Data Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Session Data: {selectedSession?.name}
          <Typography variant="subtitle2" color="text.secondary">
            {selectedSession?.type} • {selectedSession?.data?.length || 0} items
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Session Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Session ID</Typography>
                      <Typography variant="body2">{selectedSession.id}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                      <Typography variant="body2">{selectedSession.type}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                      <Typography variant="body2">{getStatusText(selectedSession.status)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                      <Typography variant="body2">{formatDate(selectedSession.dateCreated)}</Typography>
                    </Box>
                    {selectedSession.metadata && (
                      <>
                        {selectedSession.metadata.accountNames && (
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Account Names</Typography>
                            <Typography variant="body2">{selectedSession.metadata.accountNames.join(', ')}</Typography>
                          </Box>
                        )}
                        {selectedSession.metadata.hashtags && (
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Hashtags</Typography>
                            <Typography variant="body2">{selectedSession.metadata.hashtags.join(', ')}</Typography>
                          </Box>
                        )}
                        {selectedSession.metadata.maxVideos && (
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Max Videos</Typography>
                            <Typography variant="body2">{selectedSession.metadata.maxVideos}</Typography>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Data Preview ({selectedSession.data?.length || 0} items)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {selectedSession.data && selectedSession.data.length > 0 ? (
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {selectedSession.data.slice(0, 10).map((item, index) => (
                        <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Item {index + 1}
                          </Typography>
                          <Typography variant="body2" component="pre" sx={{ 
                            fontSize: '0.75rem', 
                            overflow: 'auto',
                            maxHeight: 200,
                            backgroundColor: 'grey.50',
                            p: 1,
                            borderRadius: 1
                          }}>
                            {JSON.stringify(item, null, 2)}
                          </Typography>
                        </Box>
                      ))}
                      {selectedSession.data.length > 10 && (
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                          Showing first 10 items of {selectedSession.data.length} total
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography color="text.secondary">No data available</Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedSession && (
            <Button 
              onClick={() => handleExportSession(selectedSession)} 
              startIcon={<DownloadIcon />}
              variant="outlined"
            >
              Export All Data
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DatabaseManager;
