// Common types for Handsontable grids

export interface BaseEntity {
  id: number;
}

export interface User extends BaseEntity {
  email: string;
  GSM?: string;
  admin: boolean;
  actif?: boolean;
  
  mdpTemporaire: boolean;
  titre?: string;
  fonction?: string;
  nom: string;
  prenom: string;
  niveau?: number;
  revenuQ1?: number;
  revenuQ2?: number;
  entreeFonction?: string;
  // Display fields for grid
  name?: string; // Computed from nom + prenom
  avatar?: string;
  status?: 'active' | 'inactive' | 'pending';
  progress?: number;
  graph?: string;
  tags?: string[];
  verified?: boolean;
  lastLogin?: string;
  role?: 'admin' | 'user' | 'moderator';
}

export interface GridChange {
  type: 'update' | 'delete' | 'add';
  user: Partial<User>;
  newData?: Partial<User>;
  rowIndex?: number;
}

export interface GridAction {
  className: string;
  icon: string;
  title: string;
  onClick: (rowData: any, row: number, instance: any) => void;
}

export interface GridTheme {
  theme: 'light' | 'dark';
  alternatingRows: boolean;
}

export interface GridCallbacks {
  onEdit?: (data: any) => void;
  onDelete?: (data: any) => void;
  onAdd?: (data: any) => void;
  onSave?: (changes: GridChange[]) => void;
  onRefresh?: () => void;
}
