import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const ContentCreation: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Content Creation
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Select a database, choose your character, and generate video content.
        </Typography>
        {/* Content creation interface will go here */}
      </Paper>
    </Box>
  );
};

export default ContentCreation;
