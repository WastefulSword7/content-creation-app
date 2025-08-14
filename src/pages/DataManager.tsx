import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Snackbar,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface ScrapingResult {
  id: string;
  sessionName: string;
  accountNames?: string[];
  hashtags?: string[];
  maxVideos: number;
  userId: string;
  results: VideoData[];
  createdAt: string;
}

interface VideoData {
  id: string;
  text?: string;
  videoUrl?: string;
  coverUrl?: string;
  transcript?: string;
  subtitleLinks?: SubtitleLink[];
  [key: string]: any;
}

interface SubtitleLink {
  language: string;
  downloadLink: string;
}

const DataManager: React.FC = () => {
  const [scrapingResults, setScrapingResults] = useState<ScrapingResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ScrapingResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ result: ScrapingResult; videoIndex: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchScrapingResults();
  }, []);

  useEffect(() => {
    filterResults();
  }, [scrapingResults, searchTerm, sessionFilter]);

  const fetchScrapingResults = async () => {
    try {
      const response = await fetch('/api/scraping-results');
      if (response.ok) {
        const data = await response.json();
        setScrapingResults(data);
      } else {
        throw new Error('Failed to fetch scraping results');
      }
    } catch (error) {
      console.error('Error fetching scraping results:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch scraping results',
        severity: 'error'
      });
    }
  };

  const filterResults = () => {
    let filtered = [...scrapingResults];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.sessionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (result.accountNames && result.accountNames.some(name => 
          name.toLowerCase().includes(searchTerm.toLowerCase())
        )) ||
        (result.hashtags && result.hashtags.some(tag => 
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        )) ||
        result.results.some(video => 
          video.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          video.transcript?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply session filter
    if (sessionFilter !== 'all') {
      filtered = filtered.filter(result => result.sessionName === sessionFilter);
    }

    setFilteredResults(filtered);
  };

  const handleEdit = (result: ScrapingResult, videoIndex: number, field: string, currentValue: string) => {
    setSelectedItem({ result, videoIndex, field });
    setEditValue(currentValue);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      const { result, videoIndex, field } = selectedItem;
      const updatedResults = [...scrapingResults];
      const resultIndex = updatedResults.findIndex(r => r.id === result.id);
      
      if (resultIndex !== -1) {
        updatedResults[resultIndex].results[videoIndex] = {
          ...updatedResults[resultIndex].results[videoIndex],
          [field]: editValue
        };

        // Update on the server
        const response = await fetch(`/api/scraping-results/${result.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedResults[resultIndex]),
        });

        if (response.ok) {
          setScrapingResults(updatedResults);
          setSnackbar({
            open: true,
            message: 'Data updated successfully',
            severity: 'success'
          });
        } else {
          throw new Error('Failed to update data');
        }
      }
    } catch (error) {
      console.error('Error updating data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update data',
        severity: 'error'
      });
    } finally {
      setEditDialogOpen(false);
      setSelectedItem(null);
      setEditValue('');
    }
  };

  const handleDelete = (result: ScrapingResult) => {
    setSelectedItem({ result, videoIndex: 0, field: '' });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`/api/scraping-results/${selectedItem.result.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setScrapingResults(prev => prev.filter(r => r.id !== selectedItem.result.id));
        setSnackbar({
          open: true,
          message: 'Session deleted successfully',
          severity: 'success'
        });
      } else {
        throw new Error('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete session',
        severity: 'error'
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const getUniqueSessionNames = () => {
    return Array.from(new Set(scrapingResults.map(result => result.sessionName)));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return 'No text';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <Box sx={{ p: 3, maxWidth: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Data Manager
      </Typography>
      
      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search sessions, accounts, hashtags, or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Session Filter</InputLabel>
          <Select
            value={sessionFilter}
            label="Session Filter"
            onChange={(e: SelectChangeEvent) => setSessionFilter(e.target.value)}
          >
            <MenuItem value="all">All Sessions</MenuItem>
            {getUniqueSessionNames().map(name => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchScrapingResults}
        >
          Refresh
        </Button>
      </Box>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredResults.length} of {scrapingResults.length} sessions
      </Typography>

      {/* Data Table */}
      <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Session</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Videos</TableCell>
              <TableCell>Content Preview</TableCell>
              <TableCell>Subtitles</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredResults.map((result) => (
              <React.Fragment key={result.id}>
                {result.results.map((video, videoIndex) => (
                  <TableRow key={`${result.id}-${videoIndex}`} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {result.sessionName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {result.accountNames ? `Accounts: ${result.accountNames.join(', ')}` : 
                           result.hashtags ? `Hashtags: ${result.hashtags.join(', ')}` : 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={result.accountNames ? 'Account' : 'Hashtag'} 
                        color={result.accountNames ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {videoIndex + 1} of {result.maxVideos}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ maxWidth: 300 }}>
                        {video.text && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Caption:</strong> {truncateText(video.text, 80)}
                          </Typography>
                        )}
                        {video.transcript && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Transcript:</strong> {truncateText(video.transcript, 80)}
                          </Typography>
                        )}
                        {video.videoUrl && (
                          <Typography variant="body2" color="primary">
                            <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                              View Video
                            </a>
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      {video.subtitleLinks && video.subtitleLinks.length > 0 ? (
                        <Box>
                          {video.subtitleLinks.map((link, linkIndex) => (
                            <Chip
                              key={linkIndex}
                              label={link.language}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No subtitles
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(result.createdAt)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {video.text && (
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(result, videoIndex, 'text', video.text || '')}
                            title="Edit caption"
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {video.transcript && (
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(result, videoIndex, 'transcript', video.transcript || '')}
                            title="Edit transcript"
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {videoIndex === 0 && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(result)}
                            title="Delete entire session"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit {selectedItem?.field === 'text' ? 'Caption' : 'Transcript'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={selectedItem?.field === 'text' ? 'Caption' : 'Transcript'}
            fullWidth
            multiline
            rows={6}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the entire session "{selectedItem?.result.sessionName}"? 
            This will remove all {selectedItem?.result.results.length} videos and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DataManager;
