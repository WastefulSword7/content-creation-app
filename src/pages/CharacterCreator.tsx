import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Paper,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext';
import type { Character } from '../utils/storage';
import { loadCharacters, saveCharacters, fileToDataUrl } from '../utils/storage';

const CharacterCreator: React.FC = () => {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load characters from localStorage on component mount
  useEffect(() => {
    if (!user || isInitialized) return;
    
    const savedCharacters = loadCharacters(user.id);
    setCharacters(savedCharacters);
    setIsInitialized(true);
  }, [user, isInitialized]);

  // Save characters to localStorage whenever characters change (but not on initial load)
  useEffect(() => {
    if (!user || !isInitialized) return;
    
    saveCharacters(user.id, characters);
  }, [characters, user, isInitialized]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSaveCharacter = async () => {
    if (!characterName.trim() || !selectedImage) {
      setError('Please provide both a name and an image for the character.');
      return;
    }

    try {
      // Convert image to data URL for persistence
      const dataUrl = await fileToDataUrl(selectedImage);
      
      const newCharacter: Character = {
        id: Date.now().toString(),
        name: characterName.trim(),
        imageUrl: dataUrl,
        dateCreated: new Date().toISOString()
      };

      setCharacters(prev => [...prev, newCharacter]);
      setCharacterName('');
      setSelectedImage(null);
      setPreviewUrl('');
      setIsDialogOpen(false);
      setError('');
    } catch (err) {
      setError('Failed to save character. Please try again.');
    }
  };

  const handleDeleteCharacter = (id: string) => {
    setCharacters(prev => prev.filter(char => char.id !== id));
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to access the Character Creator.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Character Creator
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setIsDialogOpen(true)}
        >
          Add Character
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Character Grid */}
      <Grid container spacing={3}>
        {characters.map((character) => (
          <Grid item xs={12} sm={6} md={4} key={character.id}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image={character.imageUrl}
                alt={character.name}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {character.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {new Date(character.dateCreated).toLocaleDateString()}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteCharacter(character.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {characters.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No characters created yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click "Add Character" to create your first character
          </Typography>
        </Paper>
      )}

      {/* Add Character Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Character</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Character Name"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              sx={{ mb: 3 }}
            />
            
            <Box sx={{ mb: 3 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="character-image-upload"
                type="file"
                onChange={handleImageSelect}
              />
              <label htmlFor="character-image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  sx={{ height: 56 }}
                >
                  Upload Character Photo
                </Button>
              </label>
            </Box>

            {previewUrl && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveCharacter}
            variant="contained"
            disabled={!characterName.trim() || !selectedImage}
          >
            Save Character
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CharacterCreator;
