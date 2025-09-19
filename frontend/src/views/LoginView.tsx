"use client"
import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ThemeRegistry from "../components/layout/ThemeRegistry"
import authService from "../services/authService"

// MUI
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from "@mui/material"
import SchoolIcon from '@mui/icons-material/School'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import KeyIcon from '@mui/icons-material/VpnKey'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export default function LoginView() {
  const router = useRouter()
  const theme = useTheme()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.push("/dashboard")
    }
  }, [router])

  const handleApiError = (err: any) => {
    if (err?.message && String(err.message).startsWith("AUTH_ERROR:")) {
      setError("Session expirée. Veuillez vous reconnecter.")
      return
    }
    setError(err?.message ?? String(err))
  }

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await authService.login(email, password)
      if (response?.requirePasswordChange) {
        setShowPasswordChange(true)
      } else {
        router.push("/dashboard")
      }
    } catch (err: any) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }
    setError("")
    setLoading(true)
    try {
      await authService.changePassword("", newPassword)
      setShowPasswordChange(false)
      router.push("/dashboard")
    } catch (err: any) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemeRegistry>
      <Container
        maxWidth="sm"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          background: theme.palette.background.default,
        }}
      >
        <Box sx={{ width: '100%' }}>
          <Card sx={{ mx: 2, borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 3, sm: 6 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: 'primary.light',
                  }}
                >
                  <SchoolIcon sx={{ color: 'primary.dark', fontSize: 34 }} />
                </Box>

                <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                  Logiscool Mons Intranet III
                </Typography>

                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  Connectez vous avec le compte fourni par votre administrateur.
                </Typography>

                {error && (
                  <Box sx={{ width: '100%', mt: 1 }}>
                    <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ color: 'error.dark' }}>
                        {error}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Box component="form" onSubmit={handleLogin} sx={{ width: '100%', mt: 1 }}>
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Mot de passe"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" aria-label="toggle password visibility">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading}
                    fullWidth
                    sx={{ mt: 2, py: 1.5, fontWeight: 600 }}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                  >
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </Button>
                </Box>

                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}>
                  Contactez popa.stefan.pro@gmail.com / 048 606 50 45 en cas de problème.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Dialog open={showPasswordChange} onClose={() => setShowPasswordChange(false)} fullWidth maxWidth="sm">
          <DialogTitle>Changement de mot de passe requis</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <Box sx={{ width: 40, height: 40, bgcolor: 'warning.light', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyIcon sx={{ color: 'warning.dark' }} />
              </Box>
              <Typography>Vous devez changer votre mot de passe avant de continuer. Choisissez un mot de passe sécurisé.</Typography>
            </Box>

            <TextField
              label="Nouveau mot de passe"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              fullWidth
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowNewPassword((s) => !s)} edge="end" aria-label="toggle new password visibility">
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText="Minimum 8 caractères, inclure majuscule, minuscule et chiffre"
            />

            <TextField
              label="Confirmez le nouveau mot de passe"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirmPassword((s) => !s)} edge="end" aria-label="toggle confirm password visibility">
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPasswordChange(false)} color="secondary">
              Annuler
            </Button>
            <Button onClick={handlePasswordChange} variant="contained" color="primary" disabled={loading || !newPassword || !confirmPassword}>
              {loading ? <CircularProgress size={18} color="inherit" /> : 'Changer le mot de passe'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeRegistry>
  )
}
