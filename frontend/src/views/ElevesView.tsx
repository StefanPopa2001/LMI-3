"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  TextField,
  Alert,
  Checkbox,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridRenderCellParams } from '@mui/x-data-grid';
import { Edit, Refresh, Upload, Delete, CloudUpload, Save } from '@mui/icons-material';

import ThemeRegistry from '../theme/ThemeRegistry';
import NavBar from '../components/layout/NavBar';
import authService from '../services/authService';
import eleveService, { Eleve, CreateEleveData } from '../services/eleveService';
import SimpleHotGrid from '../components/grid/SimpleHotGrid';
import { toast } from 'react-toastify';

interface BulkEleveData {
  nom: string;
  prenom: string;
  dateNaissance: string;
  idLogiscool?: string;
  mdpLogiscool?: string;
  contingent?: string;
  nomCompletParent?: string;
  nomCompletResponsable1?: string;
  relationResponsable1?: string;
  gsmResponsable1?: string;
  mailResponsable1?: string;
  nomCompletResponsable2?: string;
  relationResponsable2?: string;
  gsmResponsable2?: string;
  mailResponsable2?: string;
  nomCompletResponsable3?: string;
  relationResponsable3?: string;
  gsmResponsable3?: string;
  mailResponsable3?: string;
  retourSeul?: boolean;
  recuperePar?: string;
  periodeInscription?: string;
  nombreVersements?: number;
  boursier?: boolean;
  cpas?: boolean;
  membreClubCIB?: boolean;
  nomPartenaire?: string;
  montantBrutQ1?: number;
  reduction?: number;
  bourses2024Q1?: number;
  montantDu?: number;
  montantFinal?: number;
  montantPaye?: number;
  datePayment?: string;
  periodePayment?: string;
  montantBrutQ2?: number;
  reductionQ2?: number;
  boursesQ2?: number;
  montantFinalQ2?: number;
  montantPayeQ2?: number;
  datePaymentQ2?: string;
  periodePaymentQ2?: string;
  abandon?: boolean;
  dateAbandon?: string;
  remarques?: string;
  nomResponsableFiscal?: string;
  prenomResponsableFiscal?: string;
  numRegNatResponsableFiscal?: string;
  numRegNationalEleve?: string;
  dateNaissanceResponsableFiscal?: string;
  adresseResponsableFiscal?: string;
  codePostalResponsableFiscal?: string;
  localiteResponsableFiscal?: string;
  paysResponsableFiscal?: string;
  adresseEleve?: string;
  codePostalEleve?: string;
  localiteEleve?: string;
  paysEleve?: string;
  rrRestantes?: number;
}

type ColumnMeta = {
  field: keyof Eleve | keyof BulkEleveData | 'actions';
  header: string;
  type: 'text' | 'number' | 'date' | 'checkbox' | 'readonly' | 'actions';
  width?: number;
};

export default function ElevesView() {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [draftEleves, setDraftEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<number, Partial<Eleve>>>({});

  // Import dialog state
  const [importDialog, setImportDialog] = useState(false);
  const [importData, setImportData] = useState<BulkEleveData[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Table state
  const [orderBy, setOrderBy] = useState<string>('nom');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const router = useRouter();

  const handleApiError = (err: any) => {
    if (err.message && err.message.startsWith('AUTH_ERROR:')) {
      router.push('/login');
      return;
    }
    toast.error(err.message);
  };

  const isUserAuthenticated = useMemo(() => {
    if (!mounted) return false;
    return authService.isAuthenticated();
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isUserAuthenticated) {
      fetchEleves();
    }
  }, [mounted, isUserAuthenticated]);

  const fetchEleves = async () => {
    try {
      setLoading(true);
      const fetched = await eleveService.getAllEleves();
      setEleves(fetched);
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  // Columns metadata
  const columns: ColumnMeta[] = useMemo(() => {
    const cols: ColumnMeta[] = [
      { field: 'id', header: 'ID', type: 'readonly', width: 80 },
      { field: 'nom', header: 'Nom', type: 'text', width: 160 },
      { field: 'prenom', header: 'Prénom', type: 'text', width: 160 },
      { field: 'dateNaissance', header: 'Date Naissance', type: 'date', width: 160 },
      { field: 'idLogiscool', header: 'ID Logiscool', type: 'text', width: 140 },
      { field: 'mdpLogiscool', header: 'MDP Logiscool', type: 'text', width: 140 },
      { field: 'contingent', header: 'Contingent', type: 'text', width: 140 },
      { field: 'nomCompletParent', header: 'Parent', type: 'text', width: 200 },
      { field: 'nomCompletResponsable1', header: 'Resp1 Nom', type: 'text', width: 180 },
      { field: 'relationResponsable1', header: 'Resp1 Relation', type: 'text', width: 160 },
      { field: 'gsmResponsable1', header: 'Resp1 GSM', type: 'text', width: 140 },
      { field: 'mailResponsable1', header: 'Resp1 Email', type: 'text', width: 200 },
      { field: 'nomCompletResponsable2', header: 'Resp2 Nom', type: 'text', width: 180 },
      { field: 'relationResponsable2', header: 'Resp2 Relation', type: 'text', width: 160 },
      { field: 'gsmResponsable2', header: 'Resp2 GSM', type: 'text', width: 140 },
      { field: 'mailResponsable2', header: 'Resp2 Email', type: 'text', width: 200 },
      { field: 'nomCompletResponsable3', header: 'Resp3 Nom', type: 'text', width: 180 },
      { field: 'relationResponsable3', header: 'Resp3 Relation', type: 'text', width: 160 },
      { field: 'gsmResponsable3', header: 'Resp3 GSM', type: 'text', width: 140 },
      { field: 'mailResponsable3', header: 'Resp3 Email', type: 'text', width: 200 },
      { field: 'retourSeul', header: 'Retour Seul', type: 'checkbox', width: 130 },
      { field: 'recuperePar', header: 'Récupéré Par', type: 'text', width: 160 },
      { field: 'periodeInscription', header: 'Période Inscription', type: 'text', width: 160 },
      { field: 'nombreVersements', header: 'Nombre Versements', type: 'number', width: 180 },
      { field: 'boursier', header: 'Boursier', type: 'checkbox', width: 120 },
      { field: 'cpas', header: 'CPAS', type: 'checkbox', width: 100 },
      { field: 'membreClubCIB', header: 'Club CIB', type: 'checkbox', width: 120 },
      { field: 'nomPartenaire', header: 'Partenaire', type: 'text', width: 160 },
      { field: 'montantBrutQ1', header: 'Montant Brut Q1', type: 'number', width: 160 },
      { field: 'reduction', header: 'Réduction Q1', type: 'number', width: 140 },
      { field: 'bourses2024Q1', header: 'Bourses 2024 Q1', type: 'number', width: 160 },
      { field: 'montantDu', header: 'Montant Dû Q1', type: 'number', width: 150 },
      { field: 'montantFinal', header: 'Montant Final Q1', type: 'number', width: 170 },
      { field: 'montantPaye', header: 'Montant Payé Q1', type: 'number', width: 170 },
      { field: 'datePayment', header: 'Date Paiement Q1', type: 'date', width: 160 },
      { field: 'periodePayment', header: 'Période Paiement Q1', type: 'text', width: 170 },
      { field: 'montantBrutQ2', header: 'Montant Brut Q2', type: 'number', width: 160 },
      { field: 'reductionQ2', header: 'Réduction Q2', type: 'number', width: 140 },
      { field: 'boursesQ2', header: 'Bourses Q2', type: 'number', width: 140 },
      { field: 'montantFinalQ2', header: 'Montant Final Q2', type: 'number', width: 160 },
      { field: 'montantPayeQ2', header: 'Montant Payé Q2', type: 'number', width: 160 },
      { field: 'datePaymentQ2', header: 'Date Paiement Q2', type: 'date', width: 160 },
      { field: 'periodePaymentQ2', header: 'Période Paiement Q2', type: 'text', width: 170 },
      { field: 'abandon', header: 'Abandon', type: 'checkbox', width: 110 },
      { field: 'dateAbandon', header: 'Date Abandon', type: 'date', width: 160 },
      { field: 'remarques', header: 'Remarques', type: 'text', width: 240 },
      { field: 'nomResponsableFiscal', header: 'Resp Fiscal Nom', type: 'text', width: 180 },
      { field: 'prenomResponsableFiscal', header: 'Resp Fiscal Prénom', type: 'text', width: 180 },
      { field: 'numRegNatResponsableFiscal', header: 'Resp Fiscal Reg Nat', type: 'text', width: 200 },
      { field: 'dateNaissanceResponsableFiscal', header: 'Resp Fiscal Naissance', type: 'date', width: 200 },
      { field: 'adresseResponsableFiscal', header: 'Resp Fiscal Adresse', type: 'text', width: 240 },
      { field: 'codePostalResponsableFiscal', header: 'Resp Fiscal CP', type: 'text', width: 140 },
      { field: 'localiteResponsableFiscal', header: 'Resp Fiscal Localité', type: 'text', width: 180 },
      { field: 'paysResponsableFiscal', header: 'Resp Fiscal Pays', type: 'text', width: 150 },
      { field: 'numRegNationalEleve', header: 'Élève Reg Nat', type: 'text', width: 160 },
      { field: 'adresseEleve', header: 'Élève Adresse', type: 'text', width: 220 },
      { field: 'codePostalEleve', header: 'Élève CP', type: 'text', width: 120 },
      { field: 'localiteEleve', header: "Élève Localité", type: 'text', width: 160 },
      { field: 'paysEleve', header: 'Élève Pays', type: 'text', width: 140 },
      { field: 'rrRestantes', header: 'RR Restantes', type: 'number', width: 140 },
      { field: 'actions', header: 'Actions', type: 'actions', width: 120 },
    ];
    return cols;
  }, []);

  const dateFields = new Set<string>([
    'dateNaissance','datePayment','datePaymentQ2','dateAbandon','dateNaissanceResponsableFiscal'
  ]);
  const numberFields = new Set<string>([
    'nombreVersements','montantBrutQ1','reduction','bourses2024Q1','montantDu','montantFinal','montantPaye','montantBrutQ2','reductionQ2','boursesQ2','montantFinalQ2','montantPayeQ2','rrRestantes'
  ]);
  const booleanFields = new Set<string>(['retourSeul','boursier','cpas','membreClubCIB','abandon']);

  // keep draft in sync with server data
  useEffect(() => {
    setDraftEleves(eleves.map(e => ({ ...e })));
  }, [eleves]);

  // Data shown in table (render draft when editing)
  const rowsBase = useMemo(() => (isEditable ? draftEleves : eleves), [isEditable, draftEleves, eleves]);

  const sortedData = useMemo(() => {
    const arr = [...rowsBase];
    arr.sort((a: any, b: any) => {
      const av = (a as any)[orderBy];
      const bv = (b as any)[orderBy];
      if (av == null && bv == null) return 0;
      if (av == null) return order === 'asc' ? -1 : 1;
      if (bv == null) return order === 'asc' ? 1 : -1;
      if (dateFields.has(orderBy)) {
        const ad = av ? new Date(av).getTime() : 0;
        const bd = bv ? new Date(bv).getTime() : 0;
        return order === 'asc' ? ad - bd : bd - ad;
      }
      if (numberFields.has(orderBy)) {
        const an = parseFloat(av) || 0;
        const bn = parseFloat(bv) || 0;
        return order === 'asc' ? an - bn : bn - an;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as < bs) return order === 'asc' ? -1 : 1;
      if (as > bs) return order === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rowsBase, orderBy, order]);

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const toISODate = (val: string) => {
    if (!val) return undefined;
    if (val.includes('T')) {
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    }
    const d = new Date(val + 'T00:00:00');
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };

  // Local change buffering
  const handleCellChange = (id: number, field: string, value: any) => {
    setDraftEleves(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } as any : r)));
    setPendingChanges(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const handleSaveAll = async () => {
    const ids = Object.keys(pendingChanges).map(Number);
    if (!ids.length) return;
    try {
      setLoading(true);
      for (const id of ids) {
        const patch = pendingChanges[id] as Record<string, any>;
        const payload: Record<string, any> = {};
        for (const [field, val] of Object.entries(patch)) {
          if (booleanFields.has(field)) payload[field] = Boolean(val);
          else if (numberFields.has(field)) payload[field] = val === '' || val == null ? null : Number(val);
          else if (dateFields.has(field)) payload[field] = val ? toISODate(String(val)) : null;
          else payload[field] = val;
        }
        await eleveService.updateEleve(id, payload as any);
      }
      toast.success(`Élèves mis à jour (${ids.length})`);
      setPendingChanges({});
      await fetchEleves();
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTableDelete = async (row: Eleve) => {
    if (!row.id) return;
    if (window.confirm(`Supprimer ${row.prenom} ${row.nom} ?`)) {
      try {
        setLoading(true);
        await eleveService.deleteEleve(row.id);
        toast.success('Élève supprimé');
        await fetchEleves();
      } catch (err: any) {
        handleApiError(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // ===== Import helpers =====
  const parseDateFlexible = (input?: string | null): string | null => {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;
    const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const d = parseInt(ddmmyyyy[1], 10);
      const m = parseInt(ddmmyyyy[2], 10) - 1;
      const y = parseInt(ddmmyyyy[3], 10);
      const dt = new Date(Date.UTC(y, m, d));
      return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
    }
    const yyyymmdd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmdd) {
      const y = parseInt(yyyymmdd[1], 10);
      const m = parseInt(yyyymmdd[2], 10) - 1;
      const d = parseInt(yyyymmdd[3], 10);
      const dt = new Date(Date.UTC(y, m, d));
      return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  };

  const initializeImportGrid = () => {
    const empty = Array.from({ length: 20 }, () => ({
      nom: '', prenom: '', dateNaissance: '', idLogiscool: '', mdpLogiscool: '', contingent: '', nomCompletParent: '',
      nomCompletResponsable1: '', relationResponsable1: '', gsmResponsable1: '', mailResponsable1: '',
      nomCompletResponsable2: '', relationResponsable2: '', gsmResponsable2: '', mailResponsable2: '',
      nomCompletResponsable3: '', relationResponsable3: '', gsmResponsable3: '', mailResponsable3: '',
      retourSeul: false, recuperePar: '', periodeInscription: '', nombreVersements: 0, boursier: false, cpas: false, membreClubCIB: false,
      nomPartenaire: '', montantBrutQ1: 0, reduction: 0, bourses2024Q1: 0, montantDu: 0, montantFinal: 0, montantPaye: 0, datePayment: '', periodePayment: '',
      montantBrutQ2: 0, reductionQ2: 0, boursesQ2: 0, montantFinalQ2: 0, montantPayeQ2: 0, datePaymentQ2: '', periodePaymentQ2: '',
      abandon: false, dateAbandon: '', remarques: '', nomResponsableFiscal: '', prenomResponsableFiscal: '', numRegNatResponsableFiscal: '', numRegNationalEleve: '', dateNaissanceResponsableFiscal: '',
      adresseResponsableFiscal: '', codePostalResponsableFiscal: '', localiteResponsableFiscal: '', paysResponsableFiscal: '', adresseEleve: '', codePostalEleve: '', localiteEleve: '', paysEleve: '', rrRestantes: 0
    } as BulkEleveData));
    setImportData(empty);
  };

  useEffect(() => { if (importDialog) initializeImportGrid(); }, [importDialog]);

  const validateImportData = (data: BulkEleveData[]): string[] => {
    const errors: string[] = [];
    data.forEach((row, idx) => {
      const n = idx + 1;
      if (!row.nom?.trim()) errors.push(`Row ${n}: Nom is required`);
      if (!row.prenom?.trim()) errors.push(`Row ${n}: Prénom is required`);
      if (!row.dateNaissance?.trim()) errors.push(`Row ${n}: Date Naissance is required`);
      if (row.dateNaissance) {
        const iso = parseDateFlexible(row.dateNaissance);
        if (!iso) errors.push(`Row ${n}: Invalid Date Naissance`);
      }
      const mails = [row.mailResponsable1, row.mailResponsable2, row.mailResponsable3].filter(Boolean) as string[];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      mails.forEach((m, mi) => { if (!emailRegex.test(m)) errors.push(`Row ${n}: Invalid email R${mi+1}`); });
      const phones = [row.gsmResponsable1, row.gsmResponsable2, row.gsmResponsable3].filter(Boolean) as string[];
      phones.forEach((p) => { if (!/^\+?[0-9\s\-()]+$/.test(p)) errors.push(`Row ${n}: Invalid phone`); });
    });
    return errors;
  };

  const handleBulkImport = async () => {
    const dataToImport = importData.filter(r => r.nom?.trim() || r.prenom?.trim() || r.dateNaissance?.trim());
    if (dataToImport.length === 0) { toast.error('No data to import'); return; }
    const errors = validateImportData(dataToImport);
    if (errors.length) { setValidationErrors(errors); return; }
    setIsImporting(true); setValidationErrors([]);
    let ok = 0, fail = 0; const details: string[] = [];
    for (const [i, row] of dataToImport.entries()) {
      try {
        const toNum = (v: any) => v === '' || v === undefined || v === null ? undefined : Number(v);
        const toBool = (v: any) => v === true || v === 'true' || v === 1;
        const d = (v?: string) => v ? parseDateFlexible(v) : null;
        const payload: CreateEleveData = {
          nom: row.nom.trim(),
          prenom: row.prenom.trim(),
          dateNaissance: d(row.dateNaissance)!,
          idLogiscool: row.idLogiscool || undefined,
          mdpLogiscool: row.mdpLogiscool || undefined,
          contingent: row.contingent || undefined,
          nomCompletParent: row.nomCompletParent || undefined,
          nomCompletResponsable1: row.nomCompletResponsable1 || undefined,
          relationResponsable1: row.relationResponsable1 || undefined,
          gsmResponsable1: row.gsmResponsable1 || undefined,
          mailResponsable1: row.mailResponsable1 || undefined,
          nomCompletResponsable2: row.nomCompletResponsable2 || undefined,
          relationResponsable2: row.relationResponsable2 || undefined,
          gsmResponsable2: row.gsmResponsable2 || undefined,
          mailResponsable2: row.mailResponsable2 || undefined,
          nomCompletResponsable3: row.nomCompletResponsable3 || undefined,
          relationResponsable3: row.relationResponsable3 || undefined,
          gsmResponsable3: row.gsmResponsable3 || undefined,
          mailResponsable3: row.mailResponsable3 || undefined,
          retourSeul: toBool(row.retourSeul),
          recuperePar: row.recuperePar || undefined,
          periodeInscription: row.periodeInscription || undefined,
          nombreVersements: toNum(row.nombreVersements),
          boursier: toBool(row.boursier),
          cpas: toBool(row.cpas),
          membreClubCIB: toBool(row.membreClubCIB),
          nomPartenaire: row.nomPartenaire || undefined,
          montantBrutQ1: toNum(row.montantBrutQ1),
          reduction: toNum(row.reduction),
          bourses2024Q1: toNum(row.bourses2024Q1),
          montantDu: toNum(row.montantDu),
          montantFinal: toNum(row.montantFinal),
          montantPaye: toNum(row.montantPaye),
          datePayment: d(row.datePayment) || undefined,
          periodePayment: row.periodePayment || undefined,
          montantBrutQ2: toNum(row.montantBrutQ2),
          reductionQ2: toNum(row.reductionQ2),
          boursesQ2: toNum(row.boursesQ2),
          montantFinalQ2: toNum(row.montantFinalQ2),
          montantPayeQ2: toNum(row.montantPayeQ2),
          datePaymentQ2: d(row.datePaymentQ2) || undefined,
          periodePaymentQ2: row.periodePaymentQ2 || undefined,
          abandon: toBool(row.abandon),
          dateAbandon: d(row.dateAbandon) || undefined,
          remarques: row.remarques || undefined,
          nomResponsableFiscal: row.nomResponsableFiscal || undefined,
          prenomResponsableFiscal: row.prenomResponsableFiscal || undefined,
          numRegNatResponsableFiscal: row.numRegNatResponsableFiscal || undefined,
          numRegNationalEleve: row.numRegNationalEleve || undefined,
          dateNaissanceResponsableFiscal: d(row.dateNaissanceResponsableFiscal) || undefined,
          adresseResponsableFiscal: row.adresseResponsableFiscal || undefined,
          codePostalResponsableFiscal: row.codePostalResponsableFiscal || undefined,
          localiteResponsableFiscal: row.localiteResponsableFiscal || undefined,
          paysResponsableFiscal: row.paysResponsableFiscal || undefined,
          adresseEleve: row.adresseEleve || undefined,
          codePostalEleve: row.codePostalEleve || undefined,
          localiteEleve: row.localiteEleve || undefined,
          paysEleve: row.paysEleve || undefined,
          rrRestantes: toNum(row.rrRestantes),
        };
        await eleveService.createEleve(payload);
        ok++;
      } catch (err: any) {
        fail++;
        details.push(`Row ${i + 1} (${row.nom} ${row.prenom}): ${err.message}`);
      }
    }
    setIsImporting(false);
    if (ok) {
      toast.success(`Successfully imported ${ok} élève(s)${fail ? ` (${fail} failed)` : ''}`);
      await fetchEleves();
      if (!fail) { setImportDialog(false); setImportData([]); }
    }
    if (fail) toast.error(`Failed to import ${fail} rows:\n${details.join('\n')}`);
  };

  const handleOpenImport = () => { initializeImportGrid(); setImportDialog(true); setValidationErrors([]); };
  const handleCloseImport = () => { setImportDialog(false); setImportData([]); setValidationErrors([]); };

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
    return (
      <ThemeRegistry>
        <NavBar />
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, mt: 8, px: { xs: 2, sm: 3 } }}>
          <Alert severity="error">You need to be logged in to access student management.</Alert>
        </Container>
      </ThemeRegistry>
    );
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
            Gestion des élèves
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
              Liste des élèves ({eleves.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" color="primary" onClick={handleOpenImport} startIcon={<Upload />}>Import</Button>
              <Button
                variant="contained"
                onClick={() => {
                  setIsEditable(prev => {
                    const next = !prev;
                    if (!next) {
                      setPendingChanges({});
                      setDraftEleves(eleves.map(e => ({ ...e })));
                    }
                    return next;
                  });
                }}
                title={isEditable ? 'Disable Edit' : 'Enable Edit'}
              >
                <Edit />
              </Button>
              {isEditable && (
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
              <Button variant="outlined" onClick={fetchEleves} title="Refresh">
                <Refresh />
              </Button>
            </Box>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0 }}>
            <DataGrid
              rows={(isEditable ? draftEleves : eleves) as any[]}
              getRowId={(r: Eleve) => r.id as any}
              columns={(() => {
                const dgCols: GridColDef[] = columns
                  .filter(c => c.field !== 'actions')
                  .map((c): GridColDef => {
                    const f = String(c.field);
                    const base: GridColDef = {
                      field: f,
                      headerName: c.header,
                      width: c.width,
                      sortable: true,
                      editable: false,
                    };
                    base.renderCell = (params: GridRenderCellParams<any, any>) => {
                      const rowId = (params.row as any).id as number;
                      const value = params.value;
                      if (!isEditable || c.type === 'readonly') {
                        if (c.type === 'checkbox') return <span>{value ? 'Oui' : 'Non'}</span>;
                        if (c.type === 'date') {
                          const d = value ? new Date(value) : null;
                          return <span>{d && !isNaN(d.getTime()) ? d.toLocaleDateString('fr-FR') : '-'}</span>;
                        }
                        return <span>{value ?? '-'}</span>;
                      }
                      if (c.type === 'checkbox') {
                        return (
                          <Checkbox
                            checked={Boolean(value)}
                            onChange={(e) => handleCellChange(rowId, f, e.target.checked)}
                          />
                        );
                      }
                      if (c.type === 'number') {
                        return (
                          <TextField size="small" type="number" value={value ?? ''} onChange={(e) => handleCellChange(rowId, f, e.target.value)} />
                        );
                      }
                      if (c.type === 'date') {
                        const str = value ? (String(value).includes('T') ? new Date(value).toISOString().slice(0, 10) : String(value)) : '';
                        return (
                          <TextField size="small" type="date" value={str} onChange={(e) => handleCellChange(rowId, f, e.target.value)} />
                        );
                      }
                      return (
                        <TextField size="small" value={value ?? ''} onChange={(e) => handleCellChange(rowId, f, e.target.value)} />
                      );
                    };
                    return base;
                  });
                if (isEditable) {
                  dgCols.push({
                    field: '__actions__', headerName: 'Actions', width: 120, sortable: false, filterable: false,
                    renderCell: (params: GridRenderCellParams<any, any>) => (
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleTableDelete(params.row as Eleve)}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    )
                  });
                }
                return dgCols;
              })()}
              disableRowSelectionOnClick
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
              sortingOrder={['asc', 'desc']}
              disableColumnMenu={false}
              rowSelection={false}
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
                maxHeight: '70vh'
              }}
            />
          </Box>
        </Paper>

        {/* Import Dialog */}
        <Dialog
          open={importDialog}
          onClose={handleCloseImport}
          maxWidth="xl"
          fullWidth
          PaperProps={{ sx: { height: '85vh', maxHeight: '900px', width: '95vw', maxWidth: '1800px' } }}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Import Élèves</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 2, height: 'calc(100% - 120px)', display: 'flex', flexDirection: 'column' }}>
            {validationErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Please fix the following errors:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {validationErrors.slice(0, 10).map((er, i) => (<li key={i}>{er}</li>))}
                    {validationErrors.length > 10 && (<li>... and {validationErrors.length - 10} more errors</li>)}
                  </Box>
                </Box>
              </Alert>
            )}
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <SimpleHotGrid
                data={importData}
                columns={[
                  { data: 'nom', type: 'text', width: 140 },
                  { data: 'prenom', type: 'text', width: 140 },
                  { data: 'dateNaissance', type: 'text', width: 130 },
                  { data: 'idLogiscool', type: 'text', width: 120 },
                  { data: 'mdpLogiscool', type: 'text', width: 120 },
                  { data: 'contingent', type: 'text', width: 120 },
                  { data: 'nomCompletParent', type: 'text', width: 180 },
                  { data: 'nomCompletResponsable1', type: 'text', width: 180 },
                  { data: 'relationResponsable1', type: 'text', width: 160 },
                  { data: 'gsmResponsable1', type: 'text', width: 140 },
                  { data: 'mailResponsable1', type: 'text', width: 200 },
                  { data: 'nomCompletResponsable2', type: 'text', width: 180 },
                  { data: 'relationResponsable2', type: 'text', width: 160 },
                  { data: 'gsmResponsable2', type: 'text', width: 140 },
                  { data: 'mailResponsable2', type: 'text', width: 200 },
                  { data: 'nomCompletResponsable3', type: 'text', width: 180 },
                  { data: 'relationResponsable3', type: 'text', width: 160 },
                  { data: 'gsmResponsable3', type: 'text', width: 140 },
                  { data: 'mailResponsable3', type: 'text', width: 200 },
                  { data: 'retourSeul', type: 'checkbox', width: 110 },
                  { data: 'recuperePar', type: 'text', width: 140 },
                  { data: 'periodeInscription', type: 'text', width: 160 },
                  { data: 'nombreVersements', type: 'numeric', width: 160 },
                  { data: 'boursier', type: 'checkbox', width: 110 },
                  { data: 'cpas', type: 'checkbox', width: 100 },
                  { data: 'membreClubCIB', type: 'checkbox', width: 140 },
                  { data: 'nomPartenaire', type: 'text', width: 160 },
                  { data: 'montantBrutQ1', type: 'numeric', width: 150 },
                  { data: 'reduction', type: 'numeric', width: 130 },
                  { data: 'bourses2024Q1', type: 'numeric', width: 160 },
                  { data: 'montantDu', type: 'numeric', width: 140 },
                  { data: 'montantFinal', type: 'numeric', width: 150 },
                  { data: 'montantPaye', type: 'numeric', width: 150 },
                  { data: 'datePayment', type: 'text', width: 130 },
                  { data: 'periodePayment', type: 'text', width: 160 },
                  { data: 'montantBrutQ2', type: 'numeric', width: 150 },
                  { data: 'reductionQ2', type: 'numeric', width: 130 },
                  { data: 'boursesQ2', type: 'numeric', width: 130 },
                  { data: 'montantFinalQ2', type: 'numeric', width: 150 },
                  { data: 'montantPayeQ2', type: 'numeric', width: 150 },
                  { data: 'datePaymentQ2', type: 'text', width: 130 },
                  { data: 'periodePaymentQ2', type: 'text', width: 160 },
                  { data: 'abandon', type: 'checkbox', width: 110 },
                  { data: 'dateAbandon', type: 'text', width: 130 },
                  { data: 'remarques', type: 'text', width: 200 },
                  { data: 'nomResponsableFiscal', type: 'text', width: 180 },
                  { data: 'prenomResponsableFiscal', type: 'text', width: 180 },
                  { data: 'numRegNatResponsableFiscal', type: 'text', width: 200 },
                  { data: 'dateNaissanceResponsableFiscal', type: 'text', width: 200 },
                  { data: 'adresseResponsableFiscal', type: 'text', width: 220 },
                  { data: 'codePostalResponsableFiscal', type: 'text', width: 140 },
                  { data: 'localiteResponsableFiscal', type: 'text', width: 180 },
                  { data: 'paysResponsableFiscal', type: 'text', width: 140 },
                  { data: 'numRegNationalEleve', type: 'text', width: 160 },
                  { data: 'adresseEleve', type: 'text', width: 200 },
                  { data: 'codePostalEleve', type: 'text', width: 140 },
                  { data: 'localiteEleve', type: 'text', width: 160 },
                  { data: 'paysEleve', type: 'text', width: 140 },
                  { data: 'rrRestantes', type: 'numeric', width: 140 },
                ]}
                colHeaders={[
                  'Nom *','Prénom *','Naissance *','ID Logiscool','MDP Logiscool','Contingent','Parent',
                  'Resp1 Nom','Resp1 Relation','Resp1 GSM','Resp1 Email',
                  'Resp2 Nom','Resp2 Relation','Resp2 GSM','Resp2 Email',
                  'Resp3 Nom','Resp3 Relation','Resp3 GSM','Resp3 Email',
                  'Retour Seul','Récupéré Par','Période Inscription','Nombre Versements',
                  'Boursier','CPAS','Club CIB','Partenaire',
                  'Brut Q1','Réduction Q1','Bourses 2024 Q1','Dû Q1','Final Q1','Payé Q1','Date Paiement Q1','Période Paiement Q1',
                  'Brut Q2','Réduction Q2','Bourses Q2','Final Q2','Payé Q2','Date Paiement Q2','Période Paiement Q2',
                  'Abandon','Date Abandon','Remarques',
                  'Resp Fiscal Nom','Resp Fiscal Prénom','Resp Fiscal Reg Nat','Resp Fiscal Naissance','Resp Fiscal Adresse','Resp Fiscal CP','Resp Fiscal Localité','Resp Fiscal Pays',
                  'Élève Reg Nat','Élève Adresse','Élève CP','Élève Localité','Élève Pays','RR Restantes'
                ]}
                height={400}
                minWidth={1400}
                fitContainer
                onDataChange={(rows) => {
                  const next = rows as BulkEleveData[];
                  if (next.length < 20) {
                    const pad = Array.from({ length: 20 - next.length }, () => ({
                      nom: '', prenom: '', dateNaissance: ''
                    } as BulkEleveData));
                    setImportData([...next, ...pad]);
                    return;
                  }
                  setImportData(next);
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={handleCloseImport}>Cancel</Button>
            <Button
              onClick={handleBulkImport}
              variant="contained"
              disabled={isImporting || validationErrors.length > 0 || importData.filter(r => r.nom?.trim() || r.prenom?.trim() || r.dateNaissance?.trim()).length === 0}
              startIcon={isImporting ? <CircularProgress size={16} /> : <CloudUpload />}
            >
              {isImporting ? 'Importing...' : `Import ${importData.filter(r => r.nom?.trim() || r.prenom?.trim() || r.dateNaissance?.trim()).length} Élèves`}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeRegistry>
  );
}
