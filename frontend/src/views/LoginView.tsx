"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Paper, 
  TextField, 
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Login, Key } from '@mui/icons-material';

import ThemeRegistry from '../components/layout/ThemeRegistry';
import BackButton from '../components/ui/BackButton';
import authService from '../services/authService';

export default function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  // Helper function to handle API errors
  const handleApiError = (err: any) => {
    if (err.message && err.message.startsWith('AUTH_ERROR:')) {
      // Token is invalid/expired, but we're already on login page
      setError('Session expired. Please log in again.');
      return;
    }
    setError(err.message);
  };

  // Check if user is already authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      
      if (response.requirePasswordChange) {
        setShowPasswordChange(true);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Remove password length constraint for first-time login
    // if (newPassword.length < 8) {
    //   setError('Password must be at least 8 characters long');
    //   return;
    // }

    setError('');
    setLoading(true);

    try {
      await authService.changePassword('', newPassword); // Empty current password for temporary passwords
      setShowPasswordChange(false);
      router.push('/dashboard');
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeRegistry>
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <BackButton />
        
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Login sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" component="h1" gutterBottom>
              LMI 3 Login
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Enter your credentials to access the system
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                variant="outlined"
                autoComplete="email"
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                variant="outlined"
                autoComplete="current-password"
              />
              <Button 
                type="submit" 
                variant="contained" 
                size="large"
                fullWidth
                startIcon={<Login />}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
            Contact your administrator if you need help accessing your account.
          </Typography>
        </Paper>

        {/* Password Change Dialog */}
        <Dialog open={showPasswordChange} onClose={() => {}} disableEscapeKeyDown>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Key />
              Password Change Required
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You must change your password before continuing. Please choose a strong password.
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                helperText="Minimum 8 characters, must include uppercase, lowercase, and number"
              />
              
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handlePasswordChange} 
              variant="contained" 
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeRegistry>
  );
}
