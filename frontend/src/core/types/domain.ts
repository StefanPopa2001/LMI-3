// Central domain model TypeScript interfaces for frontend usage.
// These mirror (a subset of) the Prisma schema fields. Extend as needed.

export type ID = number;

export interface User {
  id: ID;
  email?: string | null;
  GSM?: string | null;
  mdp?: string; // hashed password (never expose raw on frontend)
  sel?: string | null;
  admin?: boolean | null;
  actif?: boolean | null;
  mdpTemporaire?: boolean | null;
  titre?: string | null;
  fonction?: string | null;
  nom?: string | null;
  prenom?: string | null;
  niveau?: number | null;
  revenuQ1?: number | null;
  revenuQ2?: number | null;
  entreeFonction?: string | Date | null;
  rrRestantes?: number | null;
}

export interface Eleve {
  id: ID;
  nom: string;
  prenom: string;
  dateNaissance: string | Date;
  idLogiscool?: string | null;
  retourSeul?: boolean | null;
  abandon?: boolean | null;
  dateAbandon?: string | Date | null;
  rrRestantes?: number | null;
}

export interface Classe {
  id: ID;
  nom: string;
  description?: string | null;
  level?: string | null;
  typeCours?: string | null;
  location?: string | null;
  salle?: string | null;
  teacherId: ID;
  dureeSeance: number;
  semainesSeances: string; // JSON string of week numbers
  jourSemaine?: number | null;
  heureDebut?: string | null;
  rrPossibles: boolean;
  isRecuperation: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Seance {
  id: ID;
  classeId: ID;
  dateHeure: string | Date;
  duree: number;
  statut: string;
  notes?: string | null;
  rrPossibles: boolean;
  weekNumber?: number | null;
  presentTeacherId?: ID | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Presence {
  id: ID;
  seanceId: ID;
  eleveId: ID;
  statut: string; // present | absent | no_status | awaiting
  notes?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ReplacementRequest {
  id: ID;
  eleveId: ID;
  originSeanceId: ID;
  destinationSeanceId: ID;
  status: string; // open | completed | cancelled
  destStatut: string; // present | absent | no_status
  rrType: string; // same_week | evening_recuperation
  penalizeRR: boolean;
  notes?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Setting {
  id: ID;
  category: string;
  value: string;
  label?: string | null;
  description?: string | null;
  order?: number | null;
  active: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type Period = 'AM' | 'PM';

export interface PermanenceSlot {
  id: ID;
  dayOfWeek: number; // 0-6
  period: Period;
  userId?: ID | null;
  notes?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface AttendanceDay {
  id: ID;
  date: string | Date;
  year: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Aggregates & helper types
export interface UserStatsSummary {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  tempPasswordUsers: number;
}

// Generic API envelope
export interface ApiResponse<T> {
  data: T;
  error?: string;
}
