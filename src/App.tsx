import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CharacterCreator from './pages/CharacterCreator';
import HashtagScraper from './pages/HashtagScraper';
import AccountScraper from './pages/AccountScraper';
import ContentCreation from './pages/ContentCreation';
import VideoLibrary from './pages/VideoLibrary';
import DataManager from './pages/DataManager';
import ErrorBoundary from './components/ErrorBoundary';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const AppContent: React.FC = () => {
  const { user, isLoading, login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleLogin = async (email: string, password: string) => {
    setAuthError('');
    const success = await login(email, password);
    if (!success) {
      setAuthError('Invalid email or password');
    }
  };

  const handleSignup = async (email: string, password: string, confirmPassword: string) => {
    setAuthError('');
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    const success = await signup(email, password);
    if (!success) {
      setAuthError('Email already exists');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return isSignup ? (
      <Signup
        onSignup={handleSignup}
        onSwitchToLogin={() => setIsSignup(false)}
        error={authError}
      />
    ) : (
      <Login
        onLogin={handleLogin}
        onSwitchToSignup={() => setIsSignup(true)}
        error={authError}
      />
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<CharacterCreator />} />
          <Route path="/hashtag-scraper" element={<HashtagScraper />} />
          <Route path="/account-scraper" element={
            <ErrorBoundary>
              <AccountScraper />
            </ErrorBoundary>
          } />
          <Route path="/content-creation" element={<ContentCreation />} />
          <Route path="/video-library" element={<VideoLibrary />} />
          <Route path="/data-manager" element={<DataManager />} />
        </Routes>
      </Layout>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
