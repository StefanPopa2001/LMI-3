import { config } from '../config';

const API_BASE_URL = config.API_URL;

export interface Presence {
  id: number;
  seanceId: number;
  eleveId: number;
  statut: 'present' | 'absent' | 'no_status' | 'awaiting';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  eleve: {
    id: number;
    nom: string;
    prenom: string;
  };
}

export interface SeanceWithAttendance {
  id: number;
  dateHeure: string;
  duree: number;
  statut: 'programmee' | 'terminee' | 'annulee';
  notes?: string;
  rrPossibles?: boolean;
  weekNumber?: number;
  presentTeacherId?: number | null;
  createdAt: string;
  updatedAt: string;
  presentTeacher?: {
    id: number;
    nom: string;
    prenom: string;
  } | null;
  classe: {
    id: number;
    nom: string;
  level?: string;
    isRecuperation?: boolean;
    teacher: {
      id: number;
      nom: string;
      prenom: string;
    };
    eleves: Array<{
      id: number;
      eleve: {
        id: number;
        nom: string;
        prenom: string;
      };
    }>;
  };
  presences: Presence[];
  rrMap?: {
    origin: Array<{ id: number; eleveId: number; destinationSeanceId: number; status: string; destStatut: string }>;
    destination: Array<{ id: number; eleveId: number; originSeanceId: number; status: string; destStatut: string }>;
  };
}

export interface AttendanceUpdate {
  eleveId: number;
  statut: 'present' | 'absent' | 'no_status' | 'awaiting';
  notes?: string;
}

class AttendanceService {
  private async getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async getWeeklySeances(startDate: string): Promise<SeanceWithAttendance[]> {
    const response = await fetch(`${API_BASE_URL}/admin/attendance/week/${startDate}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch weekly seances');
    }

    return response.json();
  }

  async getSeanceAttendance(seanceId: number): Promise<SeanceWithAttendance> {
    const response = await fetch(`${API_BASE_URL}/admin/seances/${seanceId}/attendance`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch seance attendance');
    }

    return response.json();
  }

  async updateAttendance(presenceId: number, statut: string, notes?: string): Promise<Presence> {
    const response = await fetch(`${API_BASE_URL}/admin/attendance/${presenceId}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ statut, notes }),
    });

    if (!response.ok) {
      throw new Error('Failed to update attendance');
    }

    return response.json();
  }

  async bulkUpdateAttendance(seanceId: number, updates: AttendanceUpdate[]): Promise<SeanceWithAttendance> {
    const response = await fetch(`${API_BASE_URL}/admin/seances/${seanceId}/attendance`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ attendanceUpdates: updates }),
    });

    if (!response.ok) {
      throw new Error('Failed to bulk update attendance');
    }

    return response.json();
  }

  // Utility functions
  getStatusLabel(statut: string): string {
    const labels: Record<string, string> = {
      'present': 'Présent',
      'absent': 'Absent',
      'no_status': 'Non défini',
      'awaiting': 'En attente'
    };
    return labels[statut] || 'Inconnu';
  }

  getStatusColor(statut: string): 'success' | 'error' | 'default' | 'warning' {
    const colors: Record<string, 'success' | 'error' | 'default' | 'warning'> = {
      'present': 'success',
      'absent': 'error',
      'no_status': 'default',
      'awaiting': 'warning'
    };
    return colors[statut] || 'default';
  }

  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(dateTime: string): string {
    return new Date(dateTime).toLocaleDateString('fr-FR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  getDayOfWeek(dateTime: string): number {
    return new Date(dateTime).getDay();
  }

  getWeekStartDate(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  getWeekDates(startDate: Date): Date[] {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  calculateAttendanceStats(seance: SeanceWithAttendance): {
    total: number;
    present: number;
    absent: number;
    awaiting: number;
    noStatus: number;
    attendanceRate: number;
  } {
    const total = seance.presences.length;
    const present = seance.presences.filter(p => p.statut === 'present').length;
    const absent = seance.presences.filter(p => p.statut === 'absent').length;
    const awaiting = seance.presences.filter(p => p.statut === 'awaiting').length;
    const noStatus = seance.presences.filter(p => p.statut === 'no_status').length;
    
    const attendanceRate = total > 0 ? (present / total) * 100 : 0;

    return {
      total,
      present,
      absent,
      awaiting,
      noStatus,
      attendanceRate
    };
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;
