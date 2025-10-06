"use client";

import * as React from 'react';
import {
  DataGrid,
  GridRowsProp,
  GridColDef,
  GridRowId,
  useGridApiRef,
} from '@mui/x-data-grid';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Container, Paper, Typography, Chip, FormControlLabel, Switch, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, ListItemButton, Card, CardContent, useMediaQuery, InputAdornment, Menu, Tooltip, Checkbox, Divider } from '@mui/material';
import { Add, Refresh, Delete as DeleteIcon, ViewColumn as ViewColumnIcon, ArrowUpward, ArrowDownward, Visibility, VisibilityOff, Save, Search, TableChart, GridView, Phone, Email, Shield, Download, UploadFile, FileDownload } from '@mui/icons-material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NavBar from '../components/layout/NavBar';
import authService, { User } from '../services/authService';
import { useRouter } from 'next/navigation';
import ThemeRegistry from '../theme/ThemeRegistry';

export default function UsersView() {
  const [rows, setRows] = React.useState<User[]>([]);
  // Selection model (array of row ids - numbers)
  const [selectionModel, setSelectionModel] = React.useState<number[]>([]);
  const apiRef = useGridApiRef();
  const [loading, setLoading] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newUser, setNewUser] = React.useState<Partial<User & { password: string }>>({
    nom: '',
    prenom: '',
    email: '',
    fonction: '',
    niveau: 0,
    GSM: '',
    codeitbryan: '',
    titre: '',
    entreeFonction: undefined,
    admin: false,
  });
  const [slotsDialogOpen, setSlotsDialogOpen] = React.useState(false);
  const STORAGE_KEY = 'users_columns_v1';

  const isAdmin = React.useMemo(() => authService.isAdmin(), []);
  // default column order (must match columns later). Confidential fields (hidden for non-admin): revenuQ1, revenuQ2, actif, mdpTemporaire
  const defaultColumnOrder = ['id','nom','prenom','email','codeitbryan','GSM','titre','fonction','niveau','entreeFonction','admin','revenuQ1','revenuQ2','actif','mdpTemporaire'];

  // column order and visibility state
  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => defaultColumnOrder);
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>(() => {
    const base = Object.fromEntries(defaultColumnOrder.map(f => [f, true]));
    if (!authService.isAdmin()) {
      base['revenuQ1'] = false;
      base['revenuQ2'] = false;
      base['actif'] = false;
      base['mdpTemporaire'] = false;
    }
    return base;
  });

  const [slots, setSlots] = React.useState<Record<string, { order: string[]; visibility: Record<string, boolean> }>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY + ':slots');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);
  const [slotName, setSlotName] = React.useState('');
  // editor state for modifying a slot inside the modal
  const [editingSlot, setEditingSlot] = React.useState<string | null>(null);
  const [editingOrder, setEditingOrder] = React.useState<string[]>([]);
  const [editingVisibility, setEditingVisibility] = React.useState<Record<string, boolean>>({});
  const [renameInput, setRenameInput] = React.useState('');

  const [currentTab, setCurrentTab] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [emailMenuAnchor, setEmailMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [excelMenuAnchor, setExcelMenuAnchor] = React.useState<null | HTMLElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  // Import preview state
  const [importPreviewOpen, setImportPreviewOpen] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState<{
    creates: any[];
    updates: { existing: User; changes: Partial<User>; diffFields: string[]; key: string }[];
    deletes: User[];
  }>({ creates: [], updates: [], deletes: [] });
  const [importSelections, setImportSelections] = React.useState<{
    creates: Set<string>;
    updates: Set<number>;
    deletes: Set<number>;
  }>({ creates: new Set(), updates: new Set(), deletes: new Set() });

  const isMobile = useMediaQuery('(max-width:600px)');

  const router = useRouter();

  // load saved preferences
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.order)) setColumnOrder(parsed.order);
        if (parsed.visibility && typeof parsed.visibility === 'object') setColumnVisibility(parsed.visibility);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // set default tab based on device
  React.useEffect(() => {
    setCurrentTab(isMobile ? 1 : 0);
  }, [isMobile]);

  // fetch users on mount
  React.useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const users = await authService.getAllUsers();
      setRows(users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectionIds: number[] = selectionModel;

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      for (const id of selectionIds) {
        await authService.deleteUser(id as number);
      }
      await fetchUsers();
      showToast(`${selectionIds.length} utilisateur(s) supprimé(s) avec succès`);
    } catch (error) {
      console.error('Failed to delete users:', error);
      showToast('Erreur lors de la suppression des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Users currently selected (based on selectionModel IDs)
  const selectedUsers = React.useMemo(() => {
    if (!selectionIds.length) return [] as User[];
    const idSet = new Set(selectionIds);
    return rows.filter(r => idSet.has(r.id));
  }, [rows, selectionIds]);

  const unique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

  const handleBulkEmail = (field: 'email' | 'codeitbryan') => {
    const emails = unique(selectedUsers.map(u => (u as any)[field] as string | undefined).filter(Boolean) as string[]);
    if (!emails.length) {
      showToast(`Aucun email ${(field === 'codeitbryan') ? 'CIB ' : ''}disponible dans la sélection`, 'error');
      return;
    }
    const bccList = emails.join(';');
    // Very long mailto URIs can break; warn if too long and place in clipboard instead
    if (bccList.length > 1800) {
      navigator.clipboard.writeText(bccList).then(() => {
        showToast('Liste d\'emails copiée (trop longue pour un mailto)');
      }).catch(() => showToast('Impossible de copier les emails', 'error'));
      return;
    }
    window.location.href = `mailto:?bcc=${encodeURIComponent(bccList)}`;
  };

  const handleCopyEmails = (field: 'email' | 'codeitbryan') => {
    const emails = unique(selectedUsers.map(u => (u as any)[field] as string | undefined).filter(Boolean) as string[]);
    if (!emails.length) {
      showToast('Aucun email à copier', 'error');
      return;
    }
    navigator.clipboard.writeText(emails.join(';')).then(() => {
      showToast('Emails copiés dans le presse-papier');
    }).catch(() => showToast('Impossible de copier', 'error'));
  };

  const processRowUpdate = async (updatedRow: User) => {
    try {
      const payload: any = { ...updatedRow };
      if (payload.niveau !== undefined) payload.niveau = Number(payload.niveau);
      if (payload.entreeFonction) payload.entreeFonction = new Date(payload.entreeFonction).toISOString();
      await authService.updateUser(updatedRow.id, payload);
      showToast('Utilisateur mis à jour avec succès');
      return updatedRow;
    } catch (error) {
      console.error('Failed to update user:', error);
      showToast('Erreur lors de la mise à jour de l\'utilisateur', 'error');
      throw error;
    }
  };

  const handleCreateUser = async () => {
    try {
      await authService.createUser(newUser as any);
      setCreateDialogOpen(false);
      setNewUser({ nom: '', prenom: '', email: '', fonction: '', niveau: 0, GSM: '', codeitbryan: '', titre: '', entreeFonction: undefined, admin: false });
      await fetchUsers();
      showToast('Utilisateur créé avec succès');
    } catch (error) {
      console.error('Failed to create user:', error);
      showToast('Erreur lors de la création de l\'utilisateur', 'error');
    }
  };

  const saveColumnPrefs = (order: string[], visibility: Record<string, boolean>) => {
    setColumnOrder(order);
    setColumnVisibility(visibility);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, visibility }));
    } catch (e) {
      // ignore
    }
  };

  // ---------------- Excel Import / Export -----------------
  // Columns included in downloadable template (reduced as requested)
  const excelColumns = [
    'email','codeitbryan','nom','prenom','GSM','titre','fonction','niveau','revenuQ1','revenuQ2','entreeFonction'
  ];

  const handleDownloadTemplate = async () => {
    try {
      const { utils, writeFile } = await import('xlsx');
      const sampleRow = {
        email: 'john.doe@example.com',
        codeitbryan: 'john.doe@cib.com',
        nom: 'Doe',
        prenom: 'John',
        GSM: '+32471223344',
        titre: 'Ing.',
        fonction: 'Développeur',
        niveau: 2,
        revenuQ1: 0,
        revenuQ2: 0,
        // EU date format dd/mm/yyyy
        entreeFonction: '01/01/2024',
      };
      const ws = utils.json_to_sheet([sampleRow], { header: excelColumns });
      // Add header order explicitly
      ws['!cols'] = excelColumns.map(() => ({ wch: 18 }));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Template');
      writeFile(wb, 'users_template.xlsx');
      showToast('Template téléchargé');
    } catch (e) {
      console.error(e);
      showToast('Erreur génération template', 'error');
    } finally {
      setExcelMenuAnchor(null);
    }
  };

  const mapRowToExport = (u: User) => ({
    email: u.email || '',
    codeitbryan: u.codeitbryan || '',
    nom: u.nom || '',
    prenom: u.prenom || '',
    GSM: u.GSM || '',
    titre: u.titre || '',
    fonction: u.fonction || '',
    niveau: u.niveau ?? '',
    revenuQ1: u.revenuQ1 ?? '',
    revenuQ2: u.revenuQ2 ?? '',
  // Export still keeps full dataset respecting visible fields. For entreeFonction keep ISO yyyy-mm-dd
  entreeFonction: u.entreeFonction ? new Date(u.entreeFonction).toISOString().slice(0,10) : '',
  admin: u.admin ? 1 : 0,
  actif: u.actif ? 1 : 0,
  mdpTemporaire: u.mdpTemporaire ? 1 : 0,
  });

  const handleExportCurrent = async () => {
    try {
      const { utils, writeFile } = await import('xlsx');
      // Filter to columns visible in current view ordering
      const visibleFields = columnOrder.filter(f => columnVisibility[f]);
      const exportRows = filteredRows.map(mapRowToExport).map(r => {
        // Keep only visible fields (fallback to all excelColumns if none matched)
        const base: Record<string, any> = {};
        (visibleFields.length ? visibleFields : excelColumns).forEach(f => { if (f in r) base[f] = (r as any)[f]; });
        return base;
      });
      const ws = utils.json_to_sheet(exportRows, { header: visibleFields.length ? visibleFields : excelColumns });
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Users');
      writeFile(wb, 'users_export.xlsx');
      showToast('Export Excel généré');
    } catch (e) {
      console.error(e);
      showToast('Erreur export', 'error');
    } finally {
      setExcelMenuAnchor(null);
    }
  };

  const parseBooleanLike = (v: any) => {
    if (v === undefined || v === null || v === '') return undefined;
    if (typeof v === 'boolean') return v;
    const s = String(v).toLowerCase();
    return ['1','true','oui','yes','y','admin','actif'].includes(s);
  };

  const handleImportFile = async (file: File) => {
    try {
      const { read, utils } = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rowsJson = utils.sheet_to_json(ws, { defval: '' });
      if (!Array.isArray(rowsJson) || !rowsJson.length) {
        showToast('Fichier vide', 'error');
        return;
      }
      const currentByEmail = new Map<string, User>();
      const currentByCib = new Map<string, User>();
      rows.forEach(u => { if (u.email) currentByEmail.set(u.email.toLowerCase(), u); if (u.codeitbryan) currentByCib.set(u.codeitbryan.toLowerCase(), u); });

      const creates: any[] = [];
      const updates: { existing: User; changes: Partial<User>; diffFields: string[]; key: string }[] = [];
      const seenKeys = new Set<string>();
      const norm = (s: any) => (s == null ? '' : String(s).trim());
      const dateToIso = (raw: any) => {
        if (!raw) return undefined;
        const trimmed = String(raw).trim();
        const slash = trimmed.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
        if (slash) {
          const [, d, m, y] = slash;
          const iso = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
          const date = new Date(iso);
          if (!isNaN(date.getTime())) return date.toISOString();
        }
        const d2 = new Date(trimmed);
        return isNaN(d2.getTime()) ? undefined : d2.toISOString();
      };

      for (const r of rowsJson) {
        const email = norm(r.email);
        const cib = norm(r.codeitbryan || r.cib);
        if (!email && !cib) continue;
        const key = (email || cib).toLowerCase();
        if (seenKeys.has(key)) continue; // skip duplicates
        seenKeys.add(key);
        const existing = (email && currentByEmail.get(email.toLowerCase())) || (cib && currentByCib.get(cib.toLowerCase()));
        const base: any = {
          email,
          codeitbryan: cib || undefined,
          nom: norm(r.nom),
          prenom: norm(r.prenom),
          GSM: norm(r.GSM || r.gsm) || undefined,
          titre: norm(r.titre) || undefined,
          fonction: norm(r.fonction) || undefined,
          niveau: r.niveau !== '' && r.niveau !== undefined ? Number(r.niveau) : undefined,
          revenuQ1: r.revenuQ1 !== '' && r.revenuQ1 !== undefined ? Number(r.revenuQ1) : undefined,
          revenuQ2: r.revenuQ2 !== '' && r.revenuQ2 !== undefined ? Number(r.revenuQ2) : undefined,
          entreeFonction: dateToIso(r.entreeFonction || r.entree_fonction),
          admin: parseBooleanLike(r.admin),
          actif: parseBooleanLike(r.actif),
          mdpTemporaire: parseBooleanLike(r.mdpTemporaire),
        };
        if (existing) {
          const diffFields: string[] = [];
            (['email','codeitbryan','nom','prenom','GSM','titre','fonction','niveau','revenuQ1','revenuQ2','entreeFonction','admin','actif','mdpTemporaire'] as const).forEach(f => {
              const oldVal: any = (existing as any)[f];
              const newVal: any = (base as any)[f];
              const oldComp = oldVal == null ? '' : String(oldVal);
              const newComp = newVal == null ? '' : String(newVal);
              if (oldComp !== newComp) diffFields.push(f);
            });
          if (diffFields.length) {
            const changes: Partial<User> = {};
            diffFields.forEach(f => { (changes as any)[f] = (base as any)[f]; });
            updates.push({ existing, changes, diffFields, key });
          }
        } else {
          creates.push({ ...base, password: r.password || r.mdp || 'Temp1234', key });
        }
      }

      // Deletion candidates: existing users whose key not in seenKeys
      const deletionCandidates: User[] = rows.filter(u => {
        const key = (u.email || u.codeitbryan || '').toLowerCase();
        if (!key) return false;
        return !seenKeys.has(key);
      });

      setImportPreview({ creates, updates, deletes: deletionCandidates });
      setImportSelections({
        creates: new Set(creates.map(c => c.key)),
        updates: new Set(updates.map(u => u.existing.id)),
        deletes: new Set(deletionCandidates.map(d => d.id)),
      });
      setImportPreviewOpen(true);
    } catch (e) {
      console.error(e);
      showToast('Erreur lecture fichier', 'error');
    } finally {
      setExcelMenuAnchor(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyImportChanges = async () => {
    setLoading(true);
    try {
      let created = 0, updated = 0, deleted = 0, errors = 0;
      // Creates
      for (const c of importPreview.creates) {
        if (!importSelections.creates.has(c.key)) continue;
        try {
          await authService.createUser(c);
          created++;
        } catch (e) { errors++; }
      }
      // Updates
      for (const u of importPreview.updates) {
        if (!importSelections.updates.has(u.existing.id)) continue;
        try {
          await authService.updateUser(u.existing.id, u.changes);
          updated++;
        } catch (e) { errors++; }
      }
      // Deletes
      for (const d of importPreview.deletes) {
        if (!importSelections.deletes.has(d.id)) continue;
        try {
          await authService.deleteUser(d.id);
          deleted++;
        } catch (e) { errors++; }
      }
      await fetchUsers();
      showToast(`Import appliqué: +${created} / ~${updated} modifiés / -${deleted} supprimés (${errors} erreur(s))`);
    } catch (e) {
      console.error(e);
      showToast('Erreur application import', 'error');
    } finally {
      setLoading(false);
      setImportPreviewOpen(false);
    }
  };

  const toggleSelection = (group: 'creates' | 'updates' | 'deletes', id: string | number) => {
    setImportSelections(prev => {
      const copy = {
        creates: new Set(prev.creates),
        updates: new Set(prev.updates),
        deletes: new Set(prev.deletes)
      };
      if (group === 'creates') {
        const key = id as string;
        copy.creates.has(key) ? copy.creates.delete(key) : copy.creates.add(key);
      } else if (group === 'updates') {
        const num = id as number;
        copy.updates.has(num) ? copy.updates.delete(num) : copy.updates.add(num);
      } else {
        const num = id as number;
        copy.deletes.has(num) ? copy.deletes.delete(num) : copy.deletes.add(num);
      }
      return copy;
    });
  };

  const bulkToggle = (group: 'creates' | 'updates' | 'deletes', check: boolean) => {
    setImportSelections(prev => {
      const copy = {
        creates: new Set(prev.creates),
        updates: new Set(prev.updates),
        deletes: new Set(prev.deletes)
      };
      if (group === 'creates') {
        copy.creates = check ? new Set(importPreview.creates.map(c => c.key)) : new Set();
      } else if (group === 'updates') {
        copy.updates = check ? new Set(importPreview.updates.map(u => u.existing.id)) : new Set();
      } else {
        copy.deletes = check ? new Set(importPreview.deletes.map(d => d.id)) : new Set();
      }
      return copy;
    });
  };

  const triggerImport = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const moveColumn = (field: string, dir: 'up' | 'down') => {
    setColumnOrder(prev => {
      const idx = prev.indexOf(field);
      if (idx === -1) return prev;
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[swap];
      next[swap] = next[idx];
      next[idx] = tmp;
      return next;
    });
  };

  const toggleVisibility = (field: string) => {
    setColumnVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const saveSlot = (name: string) => {
    if (!name) return;
    const next = { ...slots, [name]: { order: columnOrder, visibility: columnVisibility } };
    setSlots(next);
    try { localStorage.setItem(STORAGE_KEY + ':slots', JSON.stringify(next)); } catch (e) {}
    setSelectedSlot(name);
  };
  const loadSlot = (name: string) => {
    const s = slots[name];
    if (!s) return;
    setColumnOrder(s.order);
    setColumnVisibility(s.visibility);
    setSelectedSlot(name);
  };
  const deleteSlot = (name: string) => {
    const next = { ...slots };
    delete next[name];
    setSlots(next);
    try { localStorage.setItem(STORAGE_KEY + ':slots', JSON.stringify(next)); } catch (e) {}
    if (selectedSlot === name) setSelectedSlot(null);
    if (editingSlot === name) {
      setEditingSlot(null);
      setEditingOrder([]);
      setEditingVisibility({});
      setRenameInput('');
    }
  };

  const startEditingSlot = (name: string) => {
    const s = slots[name];
    if (!s) return;
    setEditingSlot(name);
    setEditingOrder([...s.order]);
    setEditingVisibility({ ...s.visibility });
    setRenameInput(name);
  };

  const saveEditedSlot = (applyRename = false) => {
    if (!editingSlot) return;
    const finalName = applyRename ? (renameInput.trim() || editingSlot) : editingSlot;
    const next = { ...slots } as Record<string, { order: string[]; visibility: Record<string, boolean> }>;
    // if renaming to a different key, delete old
    if (finalName !== editingSlot) {
      delete next[editingSlot];
    }
    next[finalName] = { order: editingOrder, visibility: editingVisibility };
    setSlots(next);
    try { localStorage.setItem(STORAGE_KEY + ':slots', JSON.stringify(next)); } catch (e) {}
    setEditingSlot(finalName);
    setSelectedSlot(finalName);
  };

  const saveAsNewFromEditor = (name: string) => {
    if (!name) return;
    const next = { ...slots, [name]: { order: editingOrder.length ? editingOrder : columnOrder, visibility: Object.keys(editingVisibility).length ? editingVisibility : columnVisibility } };
    setSlots(next);
    try { localStorage.setItem(STORAGE_KEY + ':slots', JSON.stringify(next)); } catch (e) {}
    setSelectedSlot(name);
  };

   const niveauOptions: Record<number, string> = {
     0: 'Stagiaire',
     1: 'Junior',
     2: 'Medior',
     3: 'Senior',
   };

  // filtered rows for both views
  const filteredRows = React.useMemo(() => {
    if (!searchQuery.trim()) return rows;

    const normalizedQuery = searchQuery.toLowerCase().replace(/-/g, ' ');
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);

    return rows.filter(user => {
      // Create a searchable string from all user fields
      const searchableText = [
        user.nom,
        user.prenom,
        user.email,
        user.codeitbryan,
        user.GSM,
        user.titre,
        user.fonction,
        user.niveau != null ? niveauOptions[user.niveau] || user.niveau.toString() : '',
        user.revenuQ1?.toString(),
        user.revenuQ2?.toString(),
        user.entreeFonction ? new Date(user.entreeFonction).toLocaleDateString() : '',
        user.admin ? 'admin' : 'user',
        user.actif ? 'actif' : 'inactif',
        user.mdpTemporaire ? 'mdp temp' : 'mdp ok'
      ].filter(Boolean).join(' ').toLowerCase().replace(/-/g, ' ');

      // Check if all query words are found in the searchable text
      return queryWords.every(word => searchableText.includes(word));
    });
  }, [rows, searchQuery, niveauOptions]);

  // (orderedColumns & columnVisibilityModel will be computed after `columns` is declared)

  const showToast = (message: string, severity: 'success' | 'error' = 'success') => {
    if (severity === 'success') {
      toast.success(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } else {
      toast.error(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

   const niveauValueOptions = Object.entries(niveauOptions).map(([k, label]) => ({ value: Number(k), label }));

   // Columns definition (moved up so it can be referenced by column-order logic)
   const columns: GridColDef[] = [
     { field: 'id', headerName: 'ID', width: 80 },
     { field: 'nom', headerName: 'Nom', width: 150, editable: isAdmin },
     { field: 'prenom', headerName: 'Prénom', width: 150, editable: isAdmin },
     { field: 'email', headerName: 'Email', width: 200, editable: isAdmin },
     { field: 'codeitbryan', headerName: 'Email CIB', width: 140, editable: isAdmin },
     { field: 'GSM', headerName: 'GSM', width: 140, editable: isAdmin },
     { field: 'titre', headerName: 'Titre', width: 140, editable: isAdmin },
     { field: 'fonction', headerName: 'Fonction', width: 160, editable: isAdmin },
     {
       field: 'niveau',
       headerName: 'Niveau',
       width: 140,
       editable: isAdmin,
       type: 'singleSelect',
       valueOptions: niveauValueOptions,
       renderCell: (params) => {
         const v = params.value as number | undefined;
         return <span>{v != null ? niveauOptions[v] ?? `#${v}` : '-'}</span>;
       }
     },
     { field: 'revenuQ1', headerName: 'Revenu Q1', width: 140, type: 'number', editable: isAdmin },
     { field: 'revenuQ2', headerName: 'Revenu Q2', width: 140, type: 'number', editable: isAdmin },
     {
       field: 'entreeFonction',
       headerName: 'Entrée fonction',
       width: 160,
       editable: isAdmin,
       type: 'date',
       valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString() : '-',
     },
     { field: 'admin', headerName: 'Admin', width: 100, type: 'boolean', editable: isAdmin },
     { field: 'actif', headerName: 'Actif', width: 100, type: 'boolean', editable: isAdmin },
     { field: 'mdpTemporaire', headerName: 'MDP Temp', width: 120, renderCell: (p) => (
       <Chip label={p.value ? 'Yes' : 'No'} color={p.value ? 'error' : 'success'} size="small" />
     )},
   ];

   // compute ordered columns for DataGrid and columnVisibilityModel
   const orderedColumns = React.useMemo(() => {
     return columnOrder.map(f => columns.find(c => String(c.field) === f)).filter(Boolean) as GridColDef[];
   }, [columnOrder, columns]);

   const columnVisibilityModel = React.useMemo(() => {
     // DataGrid expects { field: boolean } where true means visible
     return Object.fromEntries(Object.entries(columnVisibility).map(([k, v]) => [k, !!v]));
   }, [columnVisibility]);

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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={{ xs: 2, sm: 4 }}>
          <Typography variant="h1" component="h1" sx={{
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
            fontWeight: 'bold'
          }}>
            Gestion des utilisateurs
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={() => setCurrentTab(0)}
              color={currentTab === 0 ? 'primary' : 'default'}
              title="Vue tableau"
            >
              <TableChart />
            </IconButton>
            <IconButton
              onClick={() => setCurrentTab(1)}
              color={currentTab === 1 ? 'primary' : 'default'}
              title="Vue grille"
            >
              <GridView />
            </IconButton>
          </Box>
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

          {currentTab === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h5" sx={{ color: 'var(--color-text-primary)' }}>
                    Liste des utilisateurs ({filteredRows.length}){selectedSlot ? ` - ${selectedSlot}` : ''}
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Rechercher partout"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                    }}
                    sx={{ minWidth: 300 }}
                  />
                  {isAdmin && (
                    <IconButton
                      color="error"
                      onClick={async () => {
                        if (selectionIds.length === 0) return;
                        const ok = window.confirm(`Supprimer ${selectionIds.length} utilisateur(s) ?`);
                        if (!ok) return;
                        await handleBulkDelete();
                      }}
                      disabled={loading}
                      title="Supprimer sélection"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                  <Tooltip title="Email groupé">
                    <span>
                      <IconButton
                        color={selectionIds.length ? 'primary' : 'default'}
                        onClick={(e) => setEmailMenuAnchor(e.currentTarget)}
                      >
                        <Email />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {isAdmin && (
                    <Tooltip title="Réinitialiser mot de passe des utilisateurs sélectionnés">
                      <span>
                        <IconButton
                          color={selectionIds.length ? 'warning' : 'default'}
                          disabled={!selectionIds.length || loading}
                          onClick={async () => {
                            if (!selectionIds.length) return;
                            const ok = window.confirm(`Réinitialiser le mot de passe de ${selectionIds.length} utilisateur(s) ?\nIls perdront le rôle admin et devront changer leur mot de passe.`);
                            if (!ok) return;
                            setLoading(true);
                            try {
                              const { success, failed } = await authService.bulkResetPasswords(selectionIds);
                              showToast(`Réinitialisation: ${success} succès / ${failed} échec(s)`);
                              await fetchUsers();
                            } catch (e) {
                              showToast('Erreur lors de la réinitialisation','error');
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          <VpnKeyIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  <Menu
                    anchorEl={emailMenuAnchor}
                    open={Boolean(emailMenuAnchor)}
                    onClose={() => setEmailMenuAnchor(null)}
                  >
                    <MenuItem disabled={!selectedUsers.length} onClick={() => { handleBulkEmail('email'); setEmailMenuAnchor(null); }}>
                      Envoyer (emails perso) ({selectedUsers.filter(u => u.email).length})
                    </MenuItem>
                    <MenuItem disabled={!selectedUsers.length} onClick={() => { handleBulkEmail('codeitbryan'); setEmailMenuAnchor(null); }}>
                      Envoyer (emails CIB) ({selectedUsers.filter(u => u.codeitbryan).length})
                    </MenuItem>
                    <MenuItem disabled={!selectedUsers.length} onClick={() => { handleCopyEmails('email'); setEmailMenuAnchor(null); }}>
                      Copier emails perso
                    </MenuItem>
                    <MenuItem disabled={!selectedUsers.length} onClick={() => { handleCopyEmails('codeitbryan'); setEmailMenuAnchor(null); }}>
                      Copier emails CIB
                    </MenuItem>
                  </Menu>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {/* Excel actions */}
                  {isAdmin && (
                    <IconButton
                      color="primary"
                      onClick={(e) => setExcelMenuAnchor(e.currentTarget)}
                      title="Import / Export Excel"
                    >
                      <Download />
                    </IconButton>
                  )}
                  {isAdmin && (
                    <Menu
                      anchorEl={excelMenuAnchor}
                      open={Boolean(excelMenuAnchor)}
                      onClose={() => setExcelMenuAnchor(null)}
                    >
                      <MenuItem onClick={handleDownloadTemplate}>
                        <FileDownload fontSize="small" style={{ marginRight: 8 }} /> Télécharger template
                      </MenuItem>
                      <MenuItem onClick={triggerImport}>
                        <UploadFile fontSize="small" style={{ marginRight: 8 }} /> Importer fichier
                      </MenuItem>
                      <MenuItem onClick={handleExportCurrent}>
                        <Download fontSize="small" style={{ marginRight: 8 }} /> Exporter vue actuelle
                      </MenuItem>
                    </Menu>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportFile(f);
                    }}
                  />
                  {isAdmin && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
                      Ajouter Utilisateur
                    </Button>
                  )}

                  {isAdmin && <Button variant="outlined" onClick={() => setSlotsDialogOpen(true)}>Modifier vue</Button>}

                  <Button variant="outlined" onClick={fetchUsers} title="Refresh">
                    <Refresh />
                  </Button>
                </Box>
              </Box>


              <Box sx={{ flex: 1, minHeight: 0 }}>
                <DataGrid
                  apiRef={apiRef}
                  rows={filteredRows}
                  columns={orderedColumns}
                  columnVisibilityModel={columnVisibilityModel}
                  checkboxSelection
                  disableRowSelectionOnClick
                  onRowSelectionModelChange={(model: any) => {
                    // Defer to next frame to ensure apiRef selection state is committed
                    requestAnimationFrame(() => {
                      try {
                        const viaApi = apiRef.current?.getSelectedRows?.();
                        if (viaApi && viaApi.size >= 0) {
                          const ids = Array.from(viaApi.keys()).map(v => typeof v === 'number' ? v : Number(v)).filter(v => !Number.isNaN(v));
                          setSelectionModel(ids);
                          return;
                        }
                      } catch (e) {
                        // fallback below
                      }
                      // Fallback to raw model parsing
                      let ids: number[] = [];
                      if (Array.isArray(model)) {
                        ids = model.map(v => typeof v === 'number' ? v : Number(v)).filter(v => !Number.isNaN(v));
                      } else if (model && typeof model === 'object') {
                        if (model.ids && model.ids instanceof Set) {
                          ids = Array.from(model.ids).map(v => typeof v === 'number' ? v : Number(v)).filter(v => !Number.isNaN(v));
                        } else if (model.lookup && typeof model.lookup === 'object') {
                          ids = Object.keys(model.lookup).filter(k => model.lookup[k]).map(k => Number(k)).filter(v => !Number.isNaN(v));
                        }
                      }
                      setSelectionModel(ids);
                    });
                  }}
                  processRowUpdate={isAdmin ? processRowUpdate : undefined}
                  isCellEditable={(params) => !!isAdmin && !!params.colDef.editable}
                  sortingOrder={['asc', 'desc']}
                  initialState={{
                    columns: {
                      columnVisibilityModel: {
                        id: false,
                      },
                    },
                    sorting: {
                      sortModel: [{ field: 'nom', sort: 'asc' }],
                    },
                  }}
                  loading={loading}
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
                    maxHeight: '70vh'
                  }}
                />
              </Box>
            </>
          )}

          {currentTab === 1 && (
            <>
              {/* Search */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Rechercher dans tous les champs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  }}
                  sx={{ minWidth: 300 }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ color: 'var(--color-text-primary)' }}>
                  Grille des utilisateurs ({filteredRows.length})
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(5, 1fr)',
                    xl: 'repeat(6, 1fr)'
                  },
                  gap: 1.5
                }}>
                  {filteredRows.map((user) => (
                    <Card key={user.id} sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        boxShadow: 'none',
                      },
                    }}>
                      <CardContent sx={{ flex: 1, p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            backgroundColor: !user.actif ? 'error.main' : (user.admin ? 'primary.main' : 'grey.400'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 1.5,
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                          }}>
                            {user.nom?.[0]?.toUpperCase()}{user.prenom?.[0]?.toUpperCase()}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                {user.nom} {user.prenom}
                              </Typography>
                              {user.admin && (
                                <Shield sx={{ color: 'orange', fontSize: '1rem' }} />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }}>
                            <strong>Email CIB:</strong>&nbsp;{user.codeitbryan || 'N/A'}
                          </Typography>
                          <Typography variant="caption" sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }}>
                            <strong>Fonction:</strong>&nbsp;{user.fonction || 'N/A'}
                          </Typography>
                          <Typography variant="caption" sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }}>
                            <strong>Titre:</strong>&nbsp;{user.titre || 'N/A'}
                          </Typography>
                          <Typography variant="caption" sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }}>
                            <strong>Niveau:</strong>&nbsp;{user.niveau != null ? niveauOptions[user.niveau] || user.niveau : 'N/A'}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
                            <strong>Téléphone:</strong>&nbsp;{user.GSM || 'N/A'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 0.5, 
                          mt: 1.5, 
                          pt: 1.5, 
                          borderTop: '1px solid', 
                          borderColor: 'divider',
                          justifyContent: 'center'
                        }}>
                          <IconButton 
                            size="small" 
                            color={user.GSM ? "primary" : "default"} 
                            component="a" 
                            href={user.GSM ? `tel:${user.GSM}` : undefined}
                            disabled={!user.GSM}
                            title={user.GSM ? "Appeler" : "Aucun numéro"}
                            sx={{ p: 0.5 }}
                          >
                            <Phone fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color={user.email ? "primary" : "default"} 
                            component="a" 
                            href={user.email ? `mailto:${user.email}` : undefined}
                            disabled={!user.email}
                            title={user.email ? "Envoyer un email" : "Aucun email"}
                            sx={{ p: 0.5 }}
                          >
                            <Email fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color={user.codeitbryan ? "secondary" : "default"} 
                            component="a" 
                            href={user.codeitbryan ? `mailto:${user.codeitbryan}` : undefined}
                            disabled={!user.codeitbryan}
                            title={user.codeitbryan ? "Envoyer un email CIB" : "Aucun email CIB"}
                            sx={{ p: 0.5 }}
                          >
                            <Email fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            </>
          )}
        </Paper>

        {/* Import Preview Dialog */}
        <Dialog open={importPreviewOpen} onClose={() => setImportPreviewOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Aperçu de l'import</DialogTitle>
            <DialogContent dividers sx={{ maxHeight: '70vh' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Cochez les opérations que vous souhaitez appliquer puis confirmez.
              </Typography>
              {/* Creates */}
              <Box sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h6">Créations ({importPreview.creates.length})</Typography>
                  {importPreview.creates.length > 0 && (
                    <Button size="small" onClick={() => bulkToggle('creates', importSelections.creates.size !== importPreview.creates.length)}>
                      {importSelections.creates.size === importPreview.creates.length ? 'Tout décocher' : 'Tout cocher'}
                    </Button>
                  )}
                </Box>
                <List dense>
                  {importPreview.creates.map(c => (
                    <ListItem key={c.key} secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={importSelections.creates.has(c.key)}
                        onChange={() => toggleSelection('creates', c.key)}
                      />
                    }>
                      <ListItemText
                        primary={`${c.nom} ${c.prenom} (${c.email || c.codeitbryan})`}
                        secondary={`Fonction: ${c.fonction || '-'} | Niveau: ${c.niveau ?? '-'} | Entrée: ${c.entreeFonction ? new Date(c.entreeFonction).toLocaleDateString() : '-'}`}
                      />
                    </ListItem>
                  ))}
                  {!importPreview.creates.length && <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Aucune création</Typography>}
                </List>
              </Box>
              <Divider />
              {/* Updates */}
              <Box sx={{ my: 3 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h6">Mises à jour ({importPreview.updates.length})</Typography>
                  {importPreview.updates.length > 0 && (
                    <Button size="small" onClick={() => bulkToggle('updates', importSelections.updates.size !== importPreview.updates.length)}>
                      {importSelections.updates.size === importPreview.updates.length ? 'Tout décocher' : 'Tout cocher'}
                    </Button>
                  )}
                </Box>
                <List dense>
                  {importPreview.updates.map(u => (
                    <ListItem key={u.existing.id} alignItems="flex-start" secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={importSelections.updates.has(u.existing.id)}
                        onChange={() => toggleSelection('updates', u.existing.id)}
                      />
                    }>
                      <ListItemText
                        primary={`${u.existing.nom} ${u.existing.prenom} (${u.existing.email || u.existing.codeitbryan})`}
                        secondary={
                          <Box component="span" sx={{ display: 'block' }}>
                            {u.diffFields.map(f => (
                              <Typography key={f} variant="caption" component="div">
                                <strong>{f}:</strong>&nbsp;
                                <em>{String((u.existing as any)[f] ?? '') || '-'}</em>&nbsp;→&nbsp;
                                <em>{String((u.changes as any)[f] ?? '') || '-'}</em>
                              </Typography>
                            ))}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                  {!importPreview.updates.length && <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Aucune mise à jour</Typography>}
                </List>
              </Box>
              <Divider />
              {/* Deletes */}
              <Box sx={{ mt: 3 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h6" color="error.main">Suppressions proposées ({importPreview.deletes.length})</Typography>
                  {importPreview.deletes.length > 0 && (
                    <Button size="small" color="error" onClick={() => bulkToggle('deletes', importSelections.deletes.size !== importPreview.deletes.length)}>
                      {importSelections.deletes.size === importPreview.deletes.length ? 'Tout décocher' : 'Tout cocher'}
                    </Button>
                  )}
                </Box>
                <List dense>
                  {importPreview.deletes.map(d => (
                    <ListItem key={d.id} secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={importSelections.deletes.has(d.id)}
                        onChange={() => toggleSelection('deletes', d.id)}
                      />
                    }>
                      <ListItemText
                        primary={`${d.nom} ${d.prenom} (${d.email || d.codeitbryan || 'sans email'})`}
                        secondary={`Fonction: ${d.fonction || '-'} | Niveau: ${d.niveau ?? '-'} | Entrée: ${d.entreeFonction ? new Date(d.entreeFonction).toLocaleDateString() : '-'}`}
                      />
                    </ListItem>
                  ))}
                  {!importPreview.deletes.length && <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>Aucune suppression</Typography>}
                </List>
                {!!importPreview.deletes.length && (
                  <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                    Attention: les suppressions sont irréversibles.
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setImportPreviewOpen(false)}>Annuler</Button>
              <Button variant="contained" disabled={loading || (importSelections.creates.size===0 && importSelections.updates.size===0 && importSelections.deletes.size===0)} onClick={applyImportChanges}>Appliquer</Button>
            </DialogActions>
        </Dialog>

        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
          <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom"
              fullWidth
              value={newUser.nom}
              onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Prénom"
              fullWidth
              value={newUser.prenom}
              onChange={(e) => setNewUser({ ...newUser, prenom: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Email"
              fullWidth
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Email CIB"
              fullWidth
              value={newUser.codeitbryan as string || ''}
              onChange={(e) => setNewUser({ ...newUser, codeitbryan: e.target.value })}
            />
            <TextField
              margin="dense"
              label="GSM"
              fullWidth
              value={newUser.GSM as string || ''}
              onChange={(e) => setNewUser({ ...newUser, GSM: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Titre"
              fullWidth
              value={newUser.titre as string || ''}
              onChange={(e) => setNewUser({ ...newUser, titre: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Fonction"
              fullWidth
              value={newUser.fonction as string || ''}
              onChange={(e) => setNewUser({ ...newUser, fonction: e.target.value })}
            />

            <FormControl fullWidth margin="dense">
              <InputLabel id="niveau-label">Niveau</InputLabel>
              <Select
                labelId="niveau-label"
                label="Niveau"
                value={typeof newUser.niveau === 'number' ? newUser.niveau : 0}
                onChange={(e) => setNewUser({ ...newUser, niveau: Number(e.target.value) })}
              >
                {Object.entries(niveauOptions).map(([k, label]) => (
                  <MenuItem key={k} value={Number(k)}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              margin="dense"
              label="Entrée fonction (date)"
              type="date"
              fullWidth
              value={newUser.entreeFonction ? (new Date(newUser.entreeFonction as any)).toISOString().slice(0,10) : ''}
              onChange={(e) => setNewUser({ ...newUser, entreeFonction: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={<Switch checked={!!newUser.admin} onChange={(e) => setNewUser({ ...newUser, admin: e.target.checked })} />}
              label="Admin"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateUser}>Sauvegarder</Button>
          </DialogActions>
        </Dialog>

        {/* Columns are managed through the Préréglages (Slots) modal. */}

        <Dialog open={slotsDialogOpen} onClose={() => setSlotsDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Modifier la vue des colonnes</DialogTitle>
          <DialogContent dividers sx={{ minHeight: 400 }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ width: 300, borderRight: '1px solid', borderColor: 'divider', pr: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Vues sauvegardées</Typography>
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {Object.keys(slots).length === 0 && (
                    <ListItem>
                      <ListItemText primary="(Aucune vue sauvegardée)" />
                    </ListItem>
                  )}
                  {Object.entries(slots).map(([name, data]) => (
                    <li key={name}>
                      <ListItemButton selected={editingSlot === name} onClick={() => startEditingSlot(name)}>
                        <ListItemText primary={name} />
                        <ListItemSecondaryAction>
                          <Button size="small" variant="outlined" onClick={() => { loadSlot(name); setSlotsDialogOpen(false); }}>Appliquer</Button>
                        </ListItemSecondaryAction>
                      </ListItemButton>
                    </li>
                  ))}
                </List>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Créer une nouvelle vue</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField size="small" placeholder="Nom de la vue" value={slotName} onChange={(e) => setSlotName(e.target.value)} fullWidth />
                    <IconButton color="primary" onClick={() => { if (!slotName) return; saveSlot(slotName); setSlotName(''); }} title="Sauvegarder">
                      <Save />
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ flex: 1 }}>
                {!editingSlot && (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body1">Sélectionnez une vue pour l'éditer ou créez-en une nouvelle.</Typography>
                  </Box>
                )}

                {editingSlot && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <TextField size="small" label="Renommer la vue" value={renameInput} onChange={(e) => setRenameInput(e.target.value)} fullWidth />
                      <Button size="small" variant="contained" onClick={() => saveEditedSlot(true)}>Renommer</Button>
                      <Button size="small" color="error" onClick={() => { if (window.confirm(`Supprimer la vue '${editingSlot}' ?`)) { deleteSlot(editingSlot); } }}>Supprimer</Button>
                    </Box>

                    <Typography variant="h6">Ordre et visibilité des colonnes</Typography>
                    <List sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      {editingOrder.map((field, idx) => {
                        const col = columns.find(c => String(c.field) === field);
                        if (!col) return null;
                        return (
                          <ListItem key={field} divider>
                            <ListItemText primary={col.headerName ?? String(field)} secondary={String(field)} />
                            <ListItemSecondaryAction sx={{ display: 'flex', gap: 1 }}>
                              <IconButton size="small" onClick={() => {
                                setEditingOrder(prev => {
                                  const next = [...prev];
                                  if (idx <= 0) return next;
                                  const t = next[idx-1]; next[idx-1] = next[idx]; next[idx] = t; return next;
                                });
                              }} disabled={idx === 0} title="Monter">
                                <ArrowUpward fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => {
                                setEditingOrder(prev => {
                                  const next = [...prev];
                                  if (idx >= next.length - 1) return next;
                                  const t = next[idx+1]; next[idx+1] = next[idx]; next[idx] = t; return next;
                                });
                              }} disabled={idx === editingOrder.length - 1} title="Descendre">
                                <ArrowDownward fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => setEditingVisibility(prev => ({ ...prev, [field]: !prev[field] }))} title={editingVisibility[field] ? 'Masquer' : 'Afficher'}>
                                {editingVisibility[field] ? <Visibility /> : <VisibilityOff />}
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        );
                      })}
                    </List>

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button variant="outlined" onClick={() => { setEditingOrder([...columnOrder]); setEditingVisibility({ ...columnVisibility }); }}>Réinitialiser</Button>
                      <Button variant="contained" onClick={() => saveEditedSlot(false)}>Sauvegarder les modifications</Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSlotsDialogOpen(false)}>Fermer</Button>
          </DialogActions>
        </Dialog>
      </Container>
      <ToastContainer />
    </ThemeRegistry>
  );
}
