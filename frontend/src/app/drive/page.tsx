"use client";
import React, { useEffect, useState, useCallback } from 'react';
import NavBar from '@/components/layout/NavBar';
import { driveService, type DriveFile, type DriveListResponse } from '@/services/driveService';
import { Box, Container, Typography, Paper, Button, IconButton, LinearProgress, Card, CardContent, CardActions, Collapse, TextField, InputAdornment, Breadcrumbs, Dialog, DialogTitle, DialogContent, DialogActions, Divider } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';
import authService from '@/services/authService';
import { useDropzone } from 'react-dropzone';

export default function DrivePage() {
  const [data, setData] = useState<DriveListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewItem, setPreviewItem] = useState<DriveFile | null>(null);
  const [previewContent, setPreviewContent] = useState<{type:'text'|'binary'; content?: string; url?: string | null; proxy?: string; truncated?: boolean} | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const load = async (prefix = currentPrefix) => {
    setLoading(true);
    setError(null);
    try { const d = await driveService.list(prefix); setData(d); } catch (e:any) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(''); }, []);

  // Global drag listeners to improve reliability of highlighting
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      // Allow copy effect but prevent default navigation
      e.preventDefault();
    };
    const handleWindowDrop = (e: DragEvent) => {
      // Prevent browser from opening file if dropped outside zone
      e.preventDefault();
    };
    window.addEventListener('dragover', handleWindowDragOver, { passive: false });
    window.addEventListener('drop', handleWindowDrop, { passive: false });
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    console.log('[Drive] Drop received', { count: acceptedFiles.length, names: acceptedFiles.map(f=>f.name) });
    setUploading(true);
    let firstError: string | null = null;
    try {
      await Promise.all(acceptedFiles.map(async file => {
        try {
          await driveService.upload(file, currentPrefix);
        } catch (e:any) {
          if (!firstError) firstError = e.message || 'Upload error';
        }
      }));
      if (firstError) setError(firstError);
    } finally {
      setUploading(false);
      await load();
    }
  }, [currentPrefix]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: false, noKeyboard: true });

  // Manual fallback in case react-dropzone events are blocked by nested elements or future regressions
  const manualDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(c => c + 1);
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) setDragActive(true);
  };
  const manualDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive && e.dataTransfer?.items?.length) setDragActive(true);
  };
  const manualDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(c => {
      const next = c - 1;
      if (next <= 0) { setDragActive(false); return 0; }
      return next;
    });
  };
  const manualDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) {
      console.log('[Drive] Manual drop fallback', { count: files.length });
      await onDrop(files as File[]);
    }
    setDragActive(false);
    setDragCounter(0);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await driveService.upload(file, currentPrefix); await load(); } catch (e:any) { setError(e.message); } finally { setUploading(false); e.target.value=''; }
  };

  const handleDownload = async (file: DriveFile) => {
    try {
      const { url, proxy } = await driveService.getDownloadUrl(file.path);
      const finalUrl = url || proxy; // fallback to proxy streaming endpoint
      if (!finalUrl) throw new Error('Aucune URL de téléchargement disponible');
      window.open(finalUrl, '_blank');
    } catch (e:any) { setError(e.message); }
  };

  const handleDelete = async (file: DriveFile) => {
    if (!confirm(`Supprimer ${file.name} ?`)) return;
    try { await driveService.deleteObject(file.path); await load(); } catch (e:any) { setError(e.message); }
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!confirm(`Supprimer le dossier ${folderName} (et tout son contenu) ?`)) return;
    try {
      await driveService.deleteFolder(currentPrefix + folderName + '/');
      await load();
    } catch (e:any) { setError(e.message); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try { await driveService.createFolder(currentPrefix, newFolderName.trim()); setCreateFolderOpen(false); setNewFolderName(''); await load(); } catch(e:any){ setError(e.message);}  
  };

  const openFolder = (folderName: string) => {
    const newPrefix = (currentPrefix ? currentPrefix : '') + folderName + '/';
    setCurrentPrefix(newPrefix);
    load(newPrefix);
  };

  const navigateBreadcrumb = (index: number) => {
    if (!data) return;
    if (index === -1) { setCurrentPrefix(''); load(''); return; }
    const parts = data.prefix.split('/').filter(Boolean);
    const newPrefix = parts.slice(0, index + 1).join('/') + '/';
    setCurrentPrefix(newPrefix);
    load(newPrefix);
  };

  const handlePreview = async (file: DriveFile) => {
    setPreviewItem(file); setPreviewContent(null); setPreviewLoading(true);
    try {
      const p = await driveService.preview(file.path);
      if (p.type === 'text') {
        setPreviewContent({ type:'text', content: p.content, truncated: p.truncated });
      } else {
        setPreviewContent({ type:'binary', url: p.url || null, proxy: p.proxy });
      }
    }
    catch(e:any){ setPreviewContent(null); setError(e.message);} finally { setPreviewLoading(false);}  
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <PictureAsPdfIcon color="error" />;
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': return <ImageIcon color="primary" />;
      case 'doc': case 'docx': case 'txt': case 'md': return <DescriptionIcon color="info" />;
      case 'js': case 'ts': case 'jsx': case 'tsx': case 'html': case 'css': case 'json': case 'yml': case 'yaml': return <CodeIcon color="warning" />;
      default: return <InsertDriveFileIcon color="action" />;
    }
  };

  const filteredFiles = (data?.files || []).filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFolders = (data?.folders || []).filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));

  const user = authService.getCurrentUser();
  if (!user?.admin) return <Typography>Accès refusé</Typography>;

  const breadcrumbParts = data?.prefix.split('/').filter(Boolean) || [];
  const humanPrefix = breadcrumbParts.length === 0 ? 'Racine' : undefined;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--color-bg-main)' }}>
      <NavBar title="Drive" />
      <ToolbarOffset />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p:3, bgcolor: 'var(--color-bg-primary)' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h5" fontWeight={600}>Drive</Typography>
              <Breadcrumbs sx={{ mt: 1, fontSize: '0.85rem' }} separator="/">
                <Button size="small" onClick={()=>navigateBreadcrumb(-1)} disabled={!breadcrumbParts.length}>Racine</Button>
                {breadcrumbParts.map((part, idx) => (
                  <Button key={idx} size="small" onClick={()=>navigateBreadcrumb(idx)}>{part}</Button>
                ))}
              </Breadcrumbs>
            </Box>
            <Box display="flex" gap={1}>
              <Button variant="outlined" onClick={()=>setCreateFolderOpen(true)}>Nouveau dossier</Button>
              <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>Uploader
                <input type="file" hidden onChange={handleUpload} />
              </Button>
            </Box>
          </Box>

          <Box mb={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Rechercher fichiers ou dossiers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
              sx={{ minWidth: 280 }}
            />
            <Button size="small" variant="outlined" startIcon={showConsole ? <VisibilityOffIcon /> : <VisibilityIcon />} onClick={()=>setShowConsole(v=>!v)}>
              {showConsole ? 'Masquer console MinIO' : 'Afficher console MinIO'}
            </Button>
            <Box flexGrow={1} />
            <Button size="small" onClick={()=>load()} disabled={loading}>Rafraîchir</Button>
          </Box>

          <Collapse in={showConsole} timeout="auto" unmountOnExit>
            <Box sx={{ mb:3, height: 300, border: '1px solid var(--color-border-light)', borderRadius: 1, overflow: 'hidden' }}>
              <iframe
                src={process.env.NEXT_PUBLIC_MINIO_CONSOLE_URL || 'http://localhost:9001'}
                style={{ width: '100%', height: '100%', border: 'none', background: '#111' }}
                title="MinIO Console"
              />
            </Box>
          </Collapse>

          {/* Dropzone */}
          <Box
            {...getRootProps()}
            onDragEnter={manualDragEnter}
            onDragOver={manualDragOver}
            onDragLeave={manualDragLeave}
            onDrop={manualDrop}
            sx={{
              border: '2px dashed',
              borderColor: (isDragActive || dragActive) ? 'primary.main' : 'var(--color-border-light)',
              borderWidth: (isDragActive || dragActive) ? 3 : 2,
              borderStyle: 'dashed',
              borderRadius: 2,
              p: 3,
              mb:3,
              textAlign:'center',
              bgcolor: (isDragActive || dragActive) ? 'action.hover' : 'transparent',
              cursor:'pointer',
              transition:'all 0.15s',
              position:'relative',
              boxShadow: (isDragActive || dragActive) ? 4 : 'none',
              '&:hover':{ borderColor:'primary.main', bgcolor:'action.hover' }
            }}
          >
            <input {...getInputProps()} />
            <UploadFileIcon sx={{ fontSize: 42, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              {(isDragActive || dragActive) ? 'Déposez les fichiers ici...' : `Glissez-déposez ou cliquez pour téléverser dans ${humanPrefix || data?.prefix}`}
            </Typography>
            {uploading && (
              <Typography variant="caption" color="text.secondary" sx={{ mt:1, display:'block' }}>Téléversement en cours...</Typography>
            )}
            {dragActive && !uploading && (
              <Typography variant="caption" color="primary.main" sx={{ mt:1, display:'block' }}>Fichiers détectés...</Typography>
            )}
          </Box>

          {uploading && <LinearProgress sx={{ mb:2 }} />}
          {error && <Typography color="error" sx={{ mb:2 }}>{error}</Typography>}

          {/* Folders */}
          <Box sx={{ display:'flex', flexWrap:'wrap', gap:2, mb: filteredFolders.length ? 3 : 0 }}>
            {filteredFolders.map(folder => (
              <Card key={folder} sx={{ width:{ xs:'100%', sm:'calc(50% - 8px)', md:'calc(33.333% - 11px)', lg:'calc(25% - 12px)' }, display:'flex', flexDirection:'column', position:'relative', '&:hover':{ boxShadow:3, bgcolor:'action.hover' } }}>
                <CardContent sx={{ flexGrow:1, textAlign:'center', py: 3, cursor:'pointer' }} onClick={()=>openFolder(folder)}>
                  <FolderIcon sx={{ fontSize:40, color:'warning.main', mb:1 }} />
                  <Typography variant="subtitle2" sx={{ wordBreak:'break-word', lineHeight:1.2, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{folder}</Typography>
                </CardContent>
                <CardActions sx={{ justifyContent:'center', pt:0 }}>
                  <IconButton size="small" onClick={()=>openFolder(folder)} title="Ouvrir"><FolderIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={()=>handleDeleteFolder(folder)} title="Supprimer dossier" color="error"><DeleteIcon fontSize="small" /></IconButton>
                </CardActions>
              </Card>
            ))}
          </Box>

          {/* Files */}
          <Box sx={{ display:'flex', flexWrap:'wrap', gap:2 }}>
            {filteredFiles.map(f => (
              <Card key={f.path} sx={{ width:{ xs:'100%', sm:'calc(50% - 8px)', md:'calc(33.333% - 11px)', lg:'calc(25% - 12px)' }, display:'flex', flexDirection:'column', '&:hover':{ boxShadow:3 } }}>
                <CardContent sx={{ flexGrow:1, textAlign:'center', pb:1 }} onClick={()=>handlePreview(f)}>
                  <Box sx={{ mb:1, display:'flex', justifyContent:'center' }}>{getFileIcon(f.name)}</Box>
                  <Typography variant="subtitle2" sx={{ wordBreak:'break-word', lineHeight:1.2, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{f.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{(f.size/1024).toFixed(1)} Ko</Typography>
                  {f.lastModified && <Typography variant="caption" color="text.secondary" display="block">{new Date(f.lastModified).toLocaleDateString('fr-FR')}</Typography>}
                </CardContent>
                <CardActions sx={{ justifyContent:'center', pt:0 }}>
                  <IconButton size="small" onClick={()=>handlePreview(f)} title="Aperçu"><VisibilityIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={()=>handleDownload(f)} title="Télécharger"><DownloadIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={()=>handleDelete(f)} title="Supprimer" color="error"><DeleteIcon fontSize="small" /></IconButton>
                </CardActions>
              </Card>
            ))}
          </Box>

          {(!loading && !filteredFiles.length && !filteredFolders.length && !searchTerm) && (
            <Box textAlign="center" py={4}><FolderIcon sx={{ fontSize:60, color:'text.disabled', mb:1 }} /><Typography>Aucun élément</Typography></Box>
          )}
          {(!loading && !filteredFiles.length && !filteredFolders.length && searchTerm) && (
            <Box textAlign="center" py={4}><SearchIcon sx={{ fontSize:60, color:'text.disabled', mb:1 }} /><Typography>Aucun résultat</Typography></Box>
          )}
          {loading && <LinearProgress sx={{ mt:2 }} />}
        </Paper>
      </Container>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onClose={()=>setCreateFolderOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau dossier</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Nom du dossier" value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') handleCreateFolder(); }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt:1, display:'block' }}>Chemin: /{currentPrefix}{newFolderName || ''}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setCreateFolderOpen(false)}>Annuler</Button>
          <Button onClick={handleCreateFolder} variant="contained" disabled={!newFolderName.trim()}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onClose={()=>{ setPreviewItem(null); setPreviewContent(null); }} maxWidth="md" fullWidth>
        <DialogTitle>Aperçu : {previewItem?.name}</DialogTitle>
        <DialogContent dividers sx={{ minHeight: 300 }}>
          {previewLoading && <Typography>Chargement...</Typography>}
          {!previewLoading && previewContent?.type==='text' && (
            <Box component="pre" sx={{ m:0, fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-word', fontSize:12 }}>
              {previewContent.content}
              {previewContent.truncated && <Typography variant="caption" color="warning.main" display="block">(Tronqué)</Typography>}
            </Box>
          )}
          {!previewLoading && previewContent?.type==='binary' && (
            <Box sx={{ textAlign:'center' }}>
              {(() => {
                const displayUrl = previewContent.url || previewContent.proxy; // prefer direct URL else proxy
                if (!displayUrl) return <Typography variant="body2" color="error.main">Prévisualisation indisponible.</Typography>;
                if (/\.pdf$/i.test(previewItem?.name || '')) {
                  return <iframe src={displayUrl} style={{ width:'100%', height:400, border:'none' }} />;
                }
                if (/\.(png|jpg|jpeg|gif|svg)$/i.test(previewItem?.name || '')) {
                  return <img src={displayUrl} style={{ maxWidth:'100%', maxHeight:400 }} />;
                }
                return <Typography variant="body2" color="text.secondary">Aucun aperçu intégré disponible. Téléchargez le fichier.</Typography>;
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {previewItem && <Button onClick={()=>handleDownload(previewItem)} startIcon={<DownloadIcon />}>Télécharger</Button>}
          <Button onClick={()=>{ setPreviewItem(null); setPreviewContent(null); }}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ToolbarOffset(){
  return <Box sx={{ height: (theme:any)=> theme?.mixins?.toolbar?.minHeight || 64 }} />
}
