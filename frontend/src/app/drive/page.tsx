"use client";
import React, { useEffect, useState } from 'react';
import NavBar from '@/components/layout/NavBar';
import { driveService, type DriveFile } from '@/services/driveService';
import { Box, Container, Typography, Paper, Button, IconButton, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody, Collapse } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import authService from '@/services/authService';

export default function DrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try { setFiles(await driveService.list()); } catch (e:any) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await driveService.upload(file); await load(); } catch (e:any) { setError(e.message); } finally { setUploading(false); e.target.value=''; }
  };

  const handleDownload = async (name: string) => {
    try { const url = await driveService.getDownloadUrl(name); window.open(url, '_blank'); } catch (e:any) { setError(e.message); }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Supprimer ${name} ?`)) return;
    try { await driveService.delete(name); await load(); } catch (e:any) { setError(e.message); }
  };

  const user = authService.getCurrentUser();
  if (!user?.admin) return <Typography>Accès refusé</Typography>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--color-bg-main)' }}>
      <NavBar title="Drive" />
      <ToolbarOffset />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p:3, bgcolor: 'var(--color-bg-primary)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight={600}>Drive</Typography>
            <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>Uploader
              <input type="file" hidden onChange={handleUpload} />
            </Button>
          </Box>
          <Box mb={2} display="flex" gap={2}>
            <Button size="small" variant="outlined" startIcon={showConsole ? <VisibilityOffIcon /> : <VisibilityIcon />} onClick={()=>setShowConsole(v=>!v)}>
              {showConsole ? 'Masquer console MinIO' : 'Afficher console MinIO'}
            </Button>
          </Box>
          <Collapse in={showConsole} timeout="auto" unmountOnExit>
            <Box sx={{ mb:3, height: 400, border: '1px solid var(--color-border-light)', borderRadius: 1, overflow: 'hidden' }}>
              <iframe
                src={process.env.NEXT_PUBLIC_MINIO_CONSOLE_URL || 'http://localhost:9001'}
                style={{ width: '100%', height: '100%', border: 'none', background: '#111' }}
                title="MinIO Console"
              />
            </Box>
          </Collapse>
          {uploading && <LinearProgress sx={{ mb:2 }} />}
          {error && <Typography color="error" sx={{ mb:2 }}>{error}</Typography>}
          <Table size="small" sx={{ '& th, & td': { borderColor: 'var(--color-border-light)' } }}>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Taille (Ko)</TableCell>
                <TableCell>Modifié</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map(f => (
                <TableRow key={f.name}>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{(f.size/1024).toFixed(1)}</TableCell>
                  <TableCell>{f.lastModified ? new Date(f.lastModified).toLocaleString('fr-FR') : ''}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={()=>handleDownload(f.name)}><DownloadIcon /></IconButton>
                    <IconButton size="small" onClick={()=>handleDelete(f.name)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {(!loading && files.length===0) && (
                <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">Aucun fichier</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {loading && <LinearProgress sx={{ mt:2 }} />}
        </Paper>
      </Container>
    </Box>
  );
}

function ToolbarOffset(){
  return <Box sx={{ height: (theme:any)=> theme?.mixins?.toolbar?.minHeight || 64 }} />
}
