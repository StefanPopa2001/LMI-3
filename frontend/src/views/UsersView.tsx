"use client";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  TextField,
  Alert,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Tooltip,
  CircularProgress,
  Chip,
  Checkbox
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Edit,
  Delete,
  Refresh,
  Upload,
  CloudUpload,
  LockReset,
  Save
} from '@mui/icons-material';

import ThemeRegistry from '../components/layout/ThemeRegistry';
import NavBar from '../components/layout/NavBar';
import authService, { User } from '../services/authService';
import SimpleHotGrid from '../components/grid/SimpleHotGrid';
import { useToast } from '../components/ui/ToastManager';

interface BulkUserData {
  nom: string;
  prenom: string;
  email: string;
  codeitbryan?: string;
  GSM?: string;
  titre?: string;
  fonction?: string;
  niveau?: number;
  admin?: boolean;
  entreeFonction?: string;
}

export default function UsersView() {
  const { success: showSuccess, error: showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [draftUsers, setDraftUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; userId: number | null; userName: string }>({
    open: false,
    userId: null,
    userName: ''
  });
  const [newPassword, setNewPassword] = useState<string>('');

  // Import dialog state
  const [importDialog, setImportDialog] = useState(false);
  const [importData, setImportData] = useState<BulkUserData[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Grid state for inline editing (like ElevesView)
  const [isEditable, setIsEditable] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<number, Record<string, any>>>({});

  const router = useRouter();

  // Helper function to handle API errors
  const handleApiError = (err: any) => {
    if (err.message && err.message.startsWith('AUTH_ERROR:')) {
      // Token is invalid/expired, redirect to login
      router.push('/login');
      return;
    }
    showError(err.message);
  };

  // Table state
  const [orderBy, setOrderBy] = useState<string>('fonction');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [mounted, setMounted] = useState(false);

  // Check if current user is authenticated - only after mounting to avoid hydration issues
  const isUserAuthenticated = useMemo(() => {
    if (!mounted) return false;
    return authService.isAuthenticated();
  }, [mounted]);

  // Prepare data for table display
  const tableData = useMemo(() => {
    console.log('Computing users tableData...');
    console.log('Mounted:', mounted);
    console.log('Users length:', users.length);

    // Don't compute table data during SSR
    if (!mounted) {
      console.log('Not mounted, returning empty array');
      return [];
    }

  const userData = users.map((user: User) => ({
      ...user,
      admin: user.admin ? 'Admin' : 'User',
      niveau: (() => {
        const levelMap: { [key: number]: string } = {
          0: 'Junior',
          1: 'Medior',
          2: 'Senior'
        };
        return levelMap[user.niveau || 0] || 'Junior';
      })(),
      entreeFonction: user.entreeFonction ? new Date(user.entreeFonction).toLocaleDateString('fr-FR') : '',
      actif: (user as any).actif !== undefined ? (user as any).actif : true // Default to true if not set
    }));

    console.log('Returning userData with length:', userData.length);
    if (userData.length > 0) {
      console.log('First user data:', userData[0]);
    }

    return userData;
  }, [users, mounted]);

  // keep draft in sync with display data and reset when toggling edit off
  useEffect(() => {
    setDraftUsers(tableData.map(u => ({ ...u })));
  }, [tableData]);

  // rows source: draft while editing, display otherwise
  const rowsBase = useMemo(() => (isEditable ? draftUsers : tableData), [isEditable, draftUsers, tableData]);

  // Filtered and sorted data
  const filteredData = useMemo(() => rowsBase, [rowsBase]);

  // Sorted data
  const sortedData = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => {
      const av = (a as any)[orderBy];
      const bv = (b as any)[orderBy];
      const cmp = (x: any, y: any) => (x ?? '') < (y ?? '') ? -1 : (x ?? '') > (y ?? '') ? 1 : 0;
      let primary = cmp(String(av).toLowerCase(), String(bv).toLowerCase());
      if (order === 'desc') primary = -primary;
      if (primary !== 0) return primary;
      if (orderBy === 'fonction') {
        const byNom = cmp(String((a as any).nom).toLowerCase(), String((b as any).nom).toLowerCase());
        if (byNom !== 0) return byNom;
        return cmp(String((a as any).prenom).toLowerCase(), String((b as any).prenom).toLowerCase());
      }
      return 0;
    });
    return sorted;
  }, [filteredData, orderBy, order]);

  // Paginated data
  // DataGrid will handle pagination/filtering; keep sortedData as rows





  // Fetch users
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isUserAuthenticated) {
      fetchUsers();
      setCurrentUser(authService.getCurrentUser());
    }
  }, [mounted, isUserAuthenticated]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await authService.getAllUsers();
      setUsers(fetchedUsers);
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle sorting
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // DataGrid manages pagination internally; no custom pagination handlers needed

  // Handle user deletion
  const handleDeleteUser = async (userId: number, userName: string) => {
    if (window.confirm(`Are you sure you want to delete user ${userName}?`)) {
      try {
        setLoading(true);
        await authService.deleteUser(userId);
        showSuccess(`User ${userName} deleted successfully`);
        await fetchUsers();
      } catch (err: any) {
        handleApiError(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle immediate cell edit
  const handleCellChange = (id: number, field: string, value: any) => {
    // update draft rows
    setDraftUsers(prev => prev.map(u => (u.id === id ? { ...u, [field]: value } : u)));
    // record pending change
    setPendingChanges(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const handleSaveAll = async () => {
    const ids = Object.keys(pendingChanges).map(Number);
    if (!ids.length) return;
    try {
      setLoading(true);
      for (const id of ids) {
        const patch = pendingChanges[id] || {};
        const payload: Record<string, any> = {};
        for (const [field, val] of Object.entries(patch)) {
          if (field === 'admin') {
            payload[field] = val === 'Admin' || val === true;
          } else if (field === 'niveau') {
            const map: Record<string, number> = { Junior: 0, Medior: 1, Senior: 2 };
            payload[field] = typeof val === 'number' ? val : (map[String(val)] ?? 0);
          } else if (['nom','prenom','email','GSM','titre','fonction'].includes(field)) {
            payload[field] = val;
          } else {
            payload[field] = val;
          }
        }
        await authService.updateUser(id, payload);
      }
      showSuccess(`Users updated (${ids.length})`);
      setPendingChanges({});
      await fetchUsers();
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle immediate user deletion
  const handleTableDelete = async (user: any) => {
    if (window.confirm(`Are you sure you want to delete user ${user.prenom} ${user.nom}?`)) {
      try {
        setLoading(true);
        await authService.deleteUser(user.id);
        showSuccess('User deleted successfully');
        await fetchUsers();
      } catch (err: any) {
        handleApiError(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordDialog.userId || !newPassword) {
      showError('Password is required');
      return;
    }

    try {
      setLoading(true);
      await authService.resetUserPassword(resetPasswordDialog.userId, newPassword);
      showSuccess(`Password reset for ${resetPasswordDialog.userName}. User must change password on next login.`);
      setResetPasswordDialog({ open: false, userId: null, userName: '' });
      setNewPassword('');
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== IMPORT FUNCTIONS ====================

  // Accept DD/MM/YYYY, YYYY-MM-DD, or ISO; return YYYY-MM-DD or null
  const parseDateFlexible = (input?: string | null): string | null => {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;
    // DD/MM/YYYY
    const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const d = parseInt(ddmmyyyy[1], 10);
      const m = parseInt(ddmmyyyy[2], 10) - 1;
      const y = parseInt(ddmmyyyy[3], 10);
      const dt = new Date(Date.UTC(y, m, d));
      if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      return null;
    }
    // YYYY-MM-DD
    const yyyymmdd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmdd) {
      const y = parseInt(yyyymmdd[1], 10);
      const m = parseInt(yyyymmdd[2], 10) - 1;
      const d = parseInt(yyyymmdd[3], 10);
      const dt = new Date(Date.UTC(y, m, d));
      if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      return null;
    }
    // Fallback: parseable date
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    return null;
  };

  // Simple grid data initializer
  const initializeImportGrid = () => {
  const empty = Array.from({ length: 20 }, () => ({
      nom: '', prenom: '', email: '', codeitbryan: '', GSM: '', titre: '', fonction: '', niveau: 0, admin: false, entreeFonction: ''
    }));
    setImportData(empty);
  };

  // Initialize data on open
  React.useEffect(() => {
    if (importDialog) initializeImportGrid();
  }, [importDialog]);

  // Validate import data
  const validateImportData = (data: BulkUserData[]): string[] => {
    const errors: string[] = [];
    const emails = new Set<string>();

    data.forEach((row, index) => {
      const rowNum = index + 1;
      
      // Required fields
      if (!row.nom?.trim()) {
        errors.push(`Row ${rowNum}: Nom is required`);
      }
      if (!row.prenom?.trim()) {
        errors.push(`Row ${rowNum}: Prénom is required`);
      }
      if (!row.email?.trim()) {
        errors.push(`Row ${rowNum}: Email is required`);
      } else {
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          errors.push(`Row ${rowNum}: Invalid email format`);
        }
        
        // Check for duplicate emails in import
        if (emails.has(row.email.toLowerCase())) {
          errors.push(`Row ${rowNum}: Duplicate email in import data`);
        }
        emails.add(row.email.toLowerCase());
      }

      // Phone validation (if provided)
      if (row.GSM && !/^[\+]?[0-9\s\-\(\)]+$/.test(row.GSM)) {
        errors.push(`Row ${rowNum}: Invalid phone number format`);
      }

      // Niveau validation
      if (row.niveau !== undefined && (row.niveau < 0 || row.niveau > 2)) {
        errors.push(`Row ${rowNum}: Niveau must be between 0 and 2`);
      }

      // Date validation (if provided)
      if (row.entreeFonction && row.entreeFonction.trim()) {
        const iso = parseDateFlexible(row.entreeFonction);
        if (!iso) {
          errors.push(`Row ${rowNum}: Invalid date format for Date d'entrée (use DD/MM/YYYY or YYYY-MM-DD)`);
        }
      }
    });

    return errors;
  };

  // Process bulk import
  const handleBulkImport = async () => {
    const dataToImport = importData.filter(row => 
      row.nom?.trim() || row.prenom?.trim() || row.email?.trim()
    );

    if (dataToImport.length === 0) {
      showError('No data to import');
      return;
    }

    const errors = validateImportData(dataToImport);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsImporting(true);
    setValidationErrors([]);

    let successCount = 0;
    let failureCount = 0;
    const failureDetails: string[] = [];

    for (const [index, userData] of dataToImport.entries()) {
      try {
        // Set hardcoded default password for new users
        const tempPassword = 'BAZOU';
        const salt = Math.random().toString(36).slice(-16);
        const niveauNum = typeof (userData as any).niveau === 'string' ? parseInt((userData as any).niveau as any, 10) : (userData.niveau ?? 0);
        const entreeIso = userData.entreeFonction ? parseDateFlexible(userData.entreeFonction) : null;
        
        await authService.createUser({
          nom: userData.nom,
          prenom: userData.prenom,
          email: userData.email,
          codeitbryan: userData.codeitbryan,
          GSM: userData.GSM,
          titre: userData.titre,
          fonction: userData.fonction,
          admin: userData.admin || false,
          niveau: Number.isFinite(niveauNum as any) ? (niveauNum as number) : 0,
          entreeFonction: entreeIso || undefined,
          password: tempPassword
        });
        
        successCount++;
      } catch (err: any) {
        failureCount++;
        failureDetails.push(`Row ${index + 1} (${userData.email}): ${err.message}`);
      }
    }

    setIsImporting(false);

    if (successCount > 0) {
      showSuccess(`Successfully imported ${successCount} user(s)${failureCount > 0 ? ` (${failureCount} failed)` : ''}`);
      await fetchUsers(); // Refresh the users list
      
      if (failureCount === 0) {
        setImportDialog(false);
        setImportData([]);
      }
    }

    if (failureCount > 0) {
      showError(`Failed to import ${failureCount} user(s):\n${failureDetails.join('\n')}`);
    }
  };

  // Handle opening import dialog
  const handleOpenImport = () => {
    console.log('Opening import dialog');
    initializeImportGrid();
    setImportDialog(true);
    setValidationErrors([]);
  };

  // Handle closing import dialog
  const handleCloseImport = () => {
    setImportDialog(false);
    setImportData([]);
    setValidationErrors([]);
  };

  const userColumns: GridColDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 80 },
    {
      field: 'nom', headerName: 'Nom', width: 160,
      renderCell: (p: GridRenderCellParams) => isEditable ? (
        <TextField size="small" value={p.value ?? ''} onChange={(e) => handleCellChange(p.row.id, 'nom', e.target.value)} />
      ) : <span>{p.value}</span>
    },
    { field: 'prenom', headerName: 'Prénom', width: 160, renderCell: (p: GridRenderCellParams) => isEditable ? (
        <TextField size="small" value={p.value ?? ''} onChange={(e) => handleCellChange(p.row.id, 'prenom', e.target.value)} />
      ) : <span>{p.value}</span>
    },
    { field: 'email', headerName: 'Email', width: 240, renderCell: (p: GridRenderCellParams) => isEditable ? (
        <TextField size="small" value={p.value ?? ''} onChange={(e) => handleCellChange(p.row.id, 'email', e.target.value)} />
      ) : <span>{p.value}</span>
    },
    { field: 'codeitbryan', headerName: 'CodeItBryan', width: 200, renderCell: (p: GridRenderCellParams) => isEditable ? (
        <TextField size="small" value={p.value ?? ''} onChange={(e) => handleCellChange(p.row.id, 'codeitbryan', e.target.value)} />
      ) : <span>{p.value || '-'}</span>
    },
    { field: 'GSM', headerName: 'Téléphone', width: 150, renderCell: (p: GridRenderCellParams) => isEditable ? (
        <TextField size="small" value={p.value ?? ''} onChange={(e) => handleCellChange(p.row.id, 'GSM', e.target.value)} />
      ) : <span>{p.value || '-'}</span>
    },
    { field: 'titre', headerName: 'Titre', width: 140, renderCell: (p: GridRenderCellParams) => isEditable ? (
        <TextField size="small" value={p.value ?? ''} onChange={(e) => handleCellChange(p.row.id, 'titre', e.target.value)} />
      ) : <span>{p.value || '-'}</span>
    },
    { field: 'fonction', headerName: 'Fonction', width: 170, renderCell: (p: GridRenderCellParams) => isEditable ? (
        <TextField size="small" value={p.value ?? ''} onChange={(e) => handleCellChange(p.row.id, 'fonction', e.target.value)} />
      ) : <span>{p.value || '-'}</span>
    },
    { field: 'niveau', headerName: 'Niveau', width: 130, renderCell: (p: GridRenderCellParams) => isEditable ? (
        <FormControl size="small" fullWidth>
          <Select value={p.value || ''} onChange={(e) => handleCellChange(p.row.id, 'niveau', e.target.value)}>
            <MenuItem value="Junior">Junior</MenuItem>
            <MenuItem value="Medior">Medior</MenuItem>
            <MenuItem value="Senior">Senior</MenuItem>
          </Select>
        </FormControl>
      ) : <span>{p.value || '-'}</span>
    },
    { field: 'entreeFonction', headerName: "Date d'entrée", width: 150, sortable: false },
    { field: 'actif', headerName: 'Actif', width: 110, sortable: false, renderCell: (params: GridRenderCellParams) => isEditable ? (
        <Checkbox checked={params.value || false} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCellChange(params.row.id, 'actif', e.target.checked)} />
      ) : <Chip label={params.value ? 'Actif' : 'Inactif'} color={params.value ? 'success' : 'error'} size="small" />
    },
    { field: 'mdpTemporaire', headerName: 'Mot de passe défini', width: 160, sortable: false, renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value ? 'Temporaire' : 'Défini'} color={params.value ? 'warning' : 'success'} size="small" />
      )
    },
    { field: 'admin', headerName: 'Rôle', width: 120, sortable: false, renderCell: (p: GridRenderCellParams) => isEditable ? (
        <FormControl size="small" fullWidth>
          <Select value={p.value || ''} onChange={(e) => handleCellChange(p.row.id, 'admin', e.target.value)}>
            <MenuItem value="User">User</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
          </Select>
        </FormControl>
      ) : <Chip label={p.value === 'Admin' ? 'Admin' : 'User'} color={p.value === 'Admin' ? 'secondary' : 'primary'} size="small" />
    }
  ], [isEditable]);

  if (!mounted) {
    return (
      <ThemeRegistry>
        <NavBar />
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, mt: 8, px: { xs: 2, sm: 3 } }}>
          <Typography>Loading...</Typography>
        </Container>
      </ThemeRegistry>
    );
  }

  if (!isUserAuthenticated) {
    showError('You need to be logged in to access user management.');
    router.push('/login');
    return null;
  }

  return (
    <ThemeRegistry>
      <NavBar />
      <Container 
        maxWidth={false} 
        sx={{ 
          py: { xs: 2, sm: 4 }, 
          mt: 8, 
          px: { xs: 2, sm: 3 },
          height: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <Box display="flex" justifyContent="center" alignItems="center" mb={{ xs: 2, sm: 4 }}>
          <Typography variant="h1" component="h1" sx={{ 
            textAlign: 'center', 
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' }, 
            fontWeight: 'bold' 
          }}>
            Gestion des utilisateurs
          </Typography>
        </Box>

        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            backgroundColor: 'var(--color-bg-secondary)', 
            border: '1px solid var(--color-border-light)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ color: 'var(--color-text-primary)' }}>
              Liste des utilisateurs ({users.length})
            </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpenImport}
                startIcon={<Upload />}
                title="Import Users"
              >
                Import
              </Button>
              {currentUser?.admin && (
                <Button
                  variant="contained"
                  onClick={() => {
                    setIsEditable(prev => {
                      const next = !prev;
                      if (!next) {
                        setPendingChanges({});
                        setDraftUsers(tableData.map(u => ({ ...u })));
                      }
                      return next;
                    });
                  }}
                  title={isEditable ? 'Disable Edit' : 'Enable Edit'}
                >
                  <Edit />
                </Button>
              )}
              {currentUser?.admin && isEditable && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSaveAll}
                  disabled={Object.keys(pendingChanges).length === 0 || loading}
                  title="Save changes"
                >
                  <Save />
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={fetchUsers}
                title="Refresh"
              >
                <Refresh />
              </Button>
            </Box>
          </Box>

          {/* DataGrid with native filtering & column reordering */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <DataGrid
              rows={(isEditable ? draftUsers : tableData) as any[]}
              getRowId={(r: any) => r.id}
              columns={userColumns}
              disableRowSelectionOnClick
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
              sortingOrder={['asc', 'desc']}
              disableColumnMenu={false}
              rowSelection={false}
              // Removed pagination & checkboxSelection to show all rows
              hideFooterPagination
              hideFooterSelectedRowCount
              sx={{
                '& .MuiDataGrid-columnHeaders': {
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  backgroundColor: 'background.paper'
                },
                '& .MuiDataGrid-virtualScroller': {
                  overflowY: 'auto'
                },
                // Optional: set a max height for scroll container if parent not constraining
                maxHeight: '70vh'
              }}
            />
          </Box>
        </Paper>

        {/* Reset Password Dialog */}
        <Dialog open={resetPasswordDialog.open} onClose={() => setResetPasswordDialog({ open: false, userId: null, userName: '' })}>
          <DialogTitle>Reset Password for {resetPasswordDialog.userName}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="New Password"
              type="password"
              fullWidth
              variant="outlined"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              helperText="User will need to change this password on next login"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setResetPasswordDialog({ open: false, userId: null, userName: '' });
              setNewPassword('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} variant="contained" disabled={!newPassword || loading}>
              Reset Password
            </Button>
          </DialogActions>
        </Dialog>

        {/* Import Users Dialog */}
        <Dialog 
          open={importDialog} 
          onClose={handleCloseImport}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: { 
              height: '85vh',
              maxHeight: '900px',
              width: '95vw',
              maxWidth: '1600px'
            }
          }}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Import Users</Typography>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 2, height: 'calc(100% - 120px)', display: 'flex', flexDirection: 'column' }}>
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Please fix the following errors:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {validationErrors.slice(0, 10).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {validationErrors.length > 10 && (
                      <li>... and {validationErrors.length - 10} more errors</li>
                    )}
                  </Box>
                </Box>
              </Alert>
            )}

            {/* Grid Container */}
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <SimpleHotGrid
                data={importData}
                columns={[
                  { data: 'nom', type: 'text', width: 160 },
                  { data: 'prenom', type: 'text', width: 160 },
                  { data: 'email', type: 'text', width: 280 },
                  { data: 'codeitbryan', type: 'text', width: 200 },
                  { data: 'GSM', type: 'text', width: 160 },
                  { data: 'titre', type: 'text', width: 120 },
                  { data: 'fonction', type: 'text', width: 180 },
                  { data: 'niveau', type: 'dropdown', source: ['0','1','2','3','4','5'], width: 110 },
                  { data: 'admin', type: 'checkbox', width: 90 },
                  { data: 'entreeFonction', type: 'text', width: 160 },
                ]}
                colHeaders={['Nom *','Prénom *','Email *','CodeItBryan','Téléphone','Titre','Fonction','Niveau','Admin','Date entrée']}
        height={400}
        minWidth={1400}
        fitContainer
                onDataChange={(rows) => {
                  const next = rows as BulkUserData[];
                  // Ensure at least 20 rows present
                  if (next.length < 20) {
                    const pad = Array.from({ length: 20 - next.length }, () => ({
                      nom: '', prenom: '', email: '', GSM: '', titre: '', fonction: '', niveau: 0, admin: false, entreeFonction: ''
                    } as BulkUserData));
                    setImportData([...next, ...pad]);
                    return;
                  }
                  setImportData(next);
                }}
              />
            </Box>
      {/* bottom summary removed per request */}
          </DialogContent>

          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={handleCloseImport}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkImport}
              variant="contained"
              disabled={isImporting || validationErrors.length > 0 || importData.filter(row => row.nom?.trim() || row.prenom?.trim() || row.email?.trim()).length === 0}
              startIcon={isImporting ? <CircularProgress size={16} /> : <CloudUpload />}
            >
              {isImporting ? 'Importing...' : `Import ${importData.filter(row => row.nom?.trim() || row.prenom?.trim() || row.email?.trim()).length} Users`}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeRegistry>
  );
}
