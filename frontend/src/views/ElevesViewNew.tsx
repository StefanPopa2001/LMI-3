"use client";

import * as React from 'react';
import {
  DataGrid,
  GridRowsProp,
  GridColDef,
  GridRowId,
} from '@mui/x-data-grid';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Container, Paper, Typography, Chip, FormControlLabel, Switch, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, ListItemButton, Card, CardContent, useMediaQuery, InputAdornment } from '@mui/material';
import { Add, Refresh, Delete as DeleteIcon, ViewColumn as ViewColumnIcon, ArrowUpward, ArrowDownward, Visibility, VisibilityOff, Save, Search, TableChart, GridView } from '@mui/icons-material';
import NavBar from '../components/layout/NavBar';
import eleveService, { Eleve, CreateEleveData } from '../services/eleveService';
import { useRouter } from 'next/navigation';
import ThemeRegistry from '../theme/ThemeRegistry';

export default function ElevesView() {
  const [rows, setRows] = React.useState<Eleve[]>([]);
  const [selectionModel, setSelectionModel] = React.useState<GridRowId[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newEleve, setNewEleve] = React.useState<Partial<Eleve & { password: string }>>({
    nom: '',
    prenom: '',
    dateNaissance: '',
  });
  const [slotsDialogOpen, setSlotsDialogOpen] = React.useState(false);
  const STORAGE_KEY = 'eleves_columns_v1';

  // default column order (must match columns later)
  const defaultColumnOrder = ['id','nom','prenom','dateNaissance','idLogiscool','mdpLogiscool','contingent','nomCompletParent','nomCompletResponsable1','relationResponsable1','gsmResponsable1','mailResponsable1','nomCompletResponsable2','relationResponsable2','gsmResponsable2','mailResponsable2','nomCompletResponsable3','relationResponsable3','gsmResponsable3','mailResponsable3','retourSeul','recuperePar','periodeInscription','nombreVersements','boursier','cpas','membreClubCIB','nomPartenaire','montantBrutQ1','reduction','bourses2024Q1','montantDu','montantFinal','montantPaye','datePayment','periodePayment','montantBrutQ2','reductionQ2','boursesQ2','montantFinalQ2','montantPayeQ2','datePaymentQ2','periodePaymentQ2','abandon','dateAbandon','remarques','nomResponsableFiscal','prenomResponsableFiscal','numRegNatResponsableFiscal','dateNaissanceResponsableFiscal','adresseResponsableFiscal','codePostalResponsableFiscal','localiteResponsableFiscal','paysResponsableFiscal','numRegNationalEleve','adresseEleve','codePostalEleve','localiteEleve','paysEleve','rrRestantes'];

  // column order and visibility state
  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => defaultColumnOrder);
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>(() => Object.fromEntries(defaultColumnOrder.map(f => [f, true])));

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

  // fetch eleves on mount
  React.useEffect(() => {
    fetchEleves();
  }, []);

  const fetchEleves = async () => {
    setLoading(true);
    try {
      const eleves = await eleveService.getAllEleves();
      setRows(eleves);
    } catch (error) {
      console.error('Failed to fetch eleves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      for (const id of selectionModel) {
        await eleveService.deleteEleve(id as number);
      }
      await fetchEleves();
    } catch (error) {
      console.error('Failed to delete eleves:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRowUpdate = async (updatedRow: Eleve) => {
    try {
      const payload: any = { ...updatedRow };
      await eleveService.updateEleve(updatedRow.id, payload);
      return updatedRow;
    } catch (error) {
      console.error('Failed to update eleve:', error);
      throw error;
    }
  };

  const handleCreateEleve = async () => {
    try {
      await eleveService.createEleve(newEleve as any);
      setCreateDialogOpen(false);
      setNewEleve({ nom: '', prenom: '', dateNaissance: '' });
      await fetchEleves();
    } catch (error) {
      console.error('Failed to create eleve:', error);
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

    return rows.filter(eleves => {
      // Create a searchable string from all eleve fields
      const searchableText = [
        eleves.nom,
        eleves.prenom,
        eleves.dateNaissance ? new Date(eleves.dateNaissance).toLocaleDateString() : '',
        eleves.idLogiscool,
        eleves.mdpLogiscool,
        eleves.contingent,
        eleves.nomCompletParent,
        eleves.nomCompletResponsable1,
        eleves.relationResponsable1,
        eleves.gsmResponsable1,
        eleves.mailResponsable1,
        eleves.nomCompletResponsable2,
        eleves.relationResponsable2,
        eleves.gsmResponsable2,
        eleves.mailResponsable2,
        eleves.nomCompletResponsable3,
        eleves.relationResponsable3,
        eleves.gsmResponsable3,
        eleves.mailResponsable3,
        eleves.retourSeul ? 'oui' : 'non',
        eleves.recuperePar,
        eleves.periodeInscription,
        eleves.nombreVersements?.toString(),
        eleves.boursier ? 'oui' : 'non',
        eleves.cpas ? 'oui' : 'non',
        eleves.membreClubCIB ? 'oui' : 'non',
        eleves.nomPartenaire,
        eleves.montantBrutQ1?.toString(),
        eleves.reduction?.toString(),
        eleves.bourses2024Q1?.toString(),
        eleves.montantDu?.toString(),
        eleves.montantFinal?.toString(),
        eleves.montantPaye?.toString(),
        eleves.datePayment ? new Date(eleves.datePayment).toLocaleDateString() : '',
        eleves.periodePayment,
        eleves.montantBrutQ2?.toString(),
        eleves.reductionQ2?.toString(),
        eleves.boursesQ2?.toString(),
        eleves.montantFinalQ2?.toString(),
        eleves.montantPayeQ2?.toString(),
        eleves.datePaymentQ2 ? new Date(eleves.datePaymentQ2).toLocaleDateString() : '',
        eleves.periodePaymentQ2,
        eleves.abandon ? 'oui' : 'non',
        eleves.dateAbandon ? new Date(eleves.dateAbandon).toLocaleDateString() : '',
        eleves.remarques,
        eleves.nomResponsableFiscal,
        eleves.prenomResponsableFiscal,
        eleves.numRegNatResponsableFiscal,
        eleves.dateNaissanceResponsableFiscal ? new Date(eleves.dateNaissanceResponsableFiscal).toLocaleDateString() : '',
        eleves.adresseResponsableFiscal,
        eleves.codePostalResponsableFiscal,
        eleves.localiteResponsableFiscal,
        eleves.paysResponsableFiscal,
        eleves.numRegNationalEleve,
        eleves.adresseEleve,
        eleves.codePostalEleve,
        eleves.localiteEleve,
        eleves.paysEleve,
        eleves.rrRestantes?.toString()
      ].filter(Boolean).join(' ').toLowerCase().replace(/-/g, ' ');

      // Check if all query words are found in the searchable text
      return queryWords.every(word => searchableText.includes(word));
    });
  }, [rows, searchQuery]);

  // (orderedColumns & columnVisibilityModel will be computed after `columns` is declared)

   const niveauValueOptions = Object.entries(niveauOptions).map(([k, label]) => ({ value: Number(k), label }));

   // Columns definition (moved up so it can be referenced by column-order logic)
   const columns: GridColDef[] = [
     { field: 'id', headerName: 'ID', width: 80 },
     { field: 'nom', headerName: 'Nom', width: 150, editable: true },
     { field: 'prenom', headerName: 'Prénom', width: 150, editable: true },
     { field: 'dateNaissance', headerName: 'Date Naissance', width: 160, editable: true, type: 'date', valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString() : '-', },
     { field: 'idLogiscool', headerName: 'ID Logiscool', width: 140, editable: true },
     { field: 'mdpLogiscool', headerName: 'MDP Logiscool', width: 140, editable: true },
     { field: 'contingent', headerName: 'Contingent', width: 140, editable: true },
     { field: 'nomCompletParent', headerName: 'Parent', width: 200, editable: true },
     { field: 'nomCompletResponsable1', headerName: 'Resp1 Nom', width: 180, editable: true },
     { field: 'relationResponsable1', headerName: 'Resp1 Relation', width: 160, editable: true },
     { field: 'gsmResponsable1', headerName: 'Resp1 GSM', width: 140, editable: true },
     { field: 'mailResponsable1', headerName: 'Resp1 Email', width: 200, editable: true },
     { field: 'nomCompletResponsable2', headerName: 'Resp2 Nom', width: 180, editable: true },
     { field: 'relationResponsable2', headerName: 'Resp2 Relation', width: 160, editable: true },
     { field: 'gsmResponsable2', headerName: 'Resp2 GSM', width: 140, editable: true },
     { field: 'mailResponsable2', headerName: 'Resp2 Email', width: 200, editable: true },
     { field: 'nomCompletResponsable3', headerName: 'Resp3 Nom', width: 180, editable: true },
     { field: 'relationResponsable3', headerName: 'Resp3 Relation', width: 160, editable: true },
     { field: 'gsmResponsable3', headerName: 'Resp3 GSM', width: 140, editable: true },
     { field: 'mailResponsable3', headerName: 'Resp3 Email', width: 200, editable: true },
     { field: 'retourSeul', headerName: 'Retour Seul', width: 130, type: 'boolean', editable: true },
     { field: 'recuperePar', headerName: 'Récupéré Par', width: 160, editable: true },
     { field: 'periodeInscription', headerName: 'Période Inscription', width: 160, editable: true },
     { field: 'nombreVersements', headerName: 'Nombre Versements', width: 180, type: 'number', editable: true },
     { field: 'boursier', headerName: 'Boursier', width: 120, type: 'boolean', editable: true },
     { field: 'cpas', headerName: 'CPAS', width: 100, type: 'boolean', editable: true },
     { field: 'membreClubCIB', headerName: 'Club CIB', width: 120, type: 'boolean', editable: true },
     { field: 'nomPartenaire', headerName: 'Partenaire', width: 160, editable: true },
     { field: 'montantBrutQ1', headerName: 'Montant Brut Q1', width: 160, type: 'number', editable: true },
     { field: 'reduction', headerName: 'Réduction Q1', width: 140, type: 'number', editable: true },
     { field: 'bourses2024Q1', headerName: 'Bourses 2024 Q1', width: 160, type: 'number', editable: true },
     { field: 'montantDu', headerName: 'Montant Dû Q1', width: 150, type: 'number', editable: true },
     { field: 'montantFinal', headerName: 'Montant Final Q1', width: 170, type: 'number', editable: true },
     { field: 'montantPaye', headerName: 'Montant Payé Q1', width: 170, type: 'number', editable: true },
     { field: 'datePayment', headerName: 'Date Paiement Q1', width: 160, editable: true, type: 'date', valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString() : '-', },
     { field: 'periodePayment', headerName: 'Période Paiement Q1', width: 170, editable: true },
     { field: 'montantBrutQ2', headerName: 'Montant Brut Q2', width: 160, type: 'number', editable: true },
     { field: 'reductionQ2', headerName: 'Réduction Q2', width: 140, type: 'number', editable: true },
     { field: 'boursesQ2', headerName: 'Bourses Q2', width: 140, type: 'number', editable: true },
     { field: 'montantFinalQ2', headerName: 'Montant Final Q2', width: 160, type: 'number', editable: true },
     { field: 'montantPayeQ2', headerName: 'Montant Payé Q2', width: 160, type: 'number', editable: true },
     { field: 'datePaymentQ2', headerName: 'Date Paiement Q2', width: 160, editable: true, type: 'date', valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString() : '-', },
     { field: 'periodePaymentQ2', headerName: 'Période Paiement Q2', width: 170, editable: true },
     { field: 'abandon', headerName: 'Abandon', width: 110, type: 'boolean', editable: true },
     { field: 'dateAbandon', headerName: 'Date Abandon', width: 160, editable: true, type: 'date', valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString() : '-', },
     { field: 'remarques', headerName: 'Remarques', width: 240, editable: true },
     { field: 'nomResponsableFiscal', headerName: 'Resp Fiscal Nom', width: 180, editable: true },
     { field: 'prenomResponsableFiscal', headerName: 'Resp Fiscal Prénom', width: 180, editable: true },
     { field: 'numRegNatResponsableFiscal', headerName: 'Resp Fiscal Reg Nat', width: 200, editable: true },
     { field: 'dateNaissanceResponsableFiscal', headerName: 'Resp Fiscal Naissance', width: 200, editable: true, type: 'date', valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString() : '-', },
     { field: 'adresseResponsableFiscal', headerName: 'Resp Fiscal Adresse', width: 240, editable: true },
     { field: 'codePostalResponsableFiscal', headerName: 'Resp Fiscal CP', width: 140, editable: true },
     { field: 'localiteResponsableFiscal', headerName: 'Resp Fiscal Localité', width: 180, editable: true },
     { field: 'paysResponsableFiscal', headerName: 'Resp Fiscal Pays', width: 150, editable: true },
     { field: 'numRegNationalEleve', headerName: 'Élève Reg Nat', width: 160, editable: true },
     { field: 'adresseEleve', headerName: 'Élève Adresse', width: 220, editable: true },
     { field: 'codePostalEleve', headerName: 'Élève CP', width: 120, editable: true },
     { field: 'localiteEleve', headerName: "Élève Localité", width: 160, editable: true },
     { field: 'paysEleve', headerName: 'Élève Pays', width: 140, editable: true },
     { field: 'rrRestantes', headerName: 'RR Restantes', width: 140, type: 'number', editable: true },
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
            Gestion des élèves
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
                    Liste des élèves ({filteredRows.length})
                  </Typography>
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
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
                    Ajouter Élève
                  </Button>

                  <IconButton
                    color="error"
                    onClick={async () => {
                      if (selectionModel.length === 0) return;
                      const ok = window.confirm(`Supprimer ${selectionModel.length} élève(s) ?`);
                      if (!ok) return;
                      await handleBulkDelete();
                    }}
                    disabled={selectionModel.length === 0 || loading}
                    title="Supprimer sélection"
                  >
                    <DeleteIcon />
                  </IconButton>

                  <Button variant="outlined" onClick={() => setSlotsDialogOpen(true)}>Modifier vue</Button>

                  <Button variant="outlined" onClick={fetchEleves} title="Refresh">
                    <Refresh />
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 1 }}>
                {selectionModel.length > 0 && (
                  <Button color="error" variant="contained" onClick={handleBulkDelete} disabled={loading}>
                    Supprimer {selectionModel.length} sélectionnés
                  </Button>
                )}
              </Box>

              <Box sx={{ flex: 1, minHeight: 0 }}>
                <DataGrid
                  rows={filteredRows}
                  columns={orderedColumns}
                  columnVisibilityModel={columnVisibilityModel}
                  checkboxSelection
                  disableRowSelectionOnClick
                  onRowSelectionModelChange={(rowSelectionModel, details) => setSelectionModel(rowSelectionModel as any)}
                  processRowUpdate={processRowUpdate}
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
                  Grille des élèves ({filteredRows.length})
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(4, 1fr)'
                  },
                  gap: 2
                }}>
                  {filteredRows.map((eleve) => (
                    <Card key={eleve.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {eleve.nom} {eleve.prenom}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {eleve.dateNaissance ? new Date(eleve.dateNaissance).toLocaleDateString('fr-FR') : 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          Parent: {eleve.nomCompletParent || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          Responsable: {eleve.nomCompletResponsable1 || 'N/A'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={eleve.boursier ? 'Boursier' : 'Non boursier'} color={eleve.boursier ? 'primary' : 'default'} size="small" />
                          <Chip label={eleve.abandon ? 'Abandon' : 'Actif'} color={eleve.abandon ? 'error' : 'success'} size="small" />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            </>
          )}
        </Paper>

        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
          <DialogTitle>Ajouter un nouvel élève</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom"
              fullWidth
              value={newEleve.nom}
              onChange={(e) => setNewEleve({ ...newEleve, nom: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Prénom"
              fullWidth
              value={newEleve.prenom}
              onChange={(e) => setNewEleve({ ...newEleve, prenom: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Date de naissance"
              type="date"
              fullWidth
              value={newEleve.dateNaissance}
              onChange={(e) => setNewEleve({ ...newEleve, dateNaissance: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateEleve}>Sauvegarder</Button>
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
                      <Button variant="outlined" onClick={() => { if (editingSlot) startEditingSlot(editingSlot); }}>Réinitialiser</Button>
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
    </ThemeRegistry>
  );
}