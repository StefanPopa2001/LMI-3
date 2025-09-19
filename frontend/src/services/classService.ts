const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Teacher {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

export interface Student {
  id: number;
  nom: string;
  prenom: string;
}

export interface ClasseEleve {
  id: number;
  eleve: Student;
}

export interface Seance {
  id: number;
  dateHeure: string;
  duree: number;
  statut: 'programmee' | 'terminee' | 'annulee';
  notes?: string;
  rrPossibles: boolean;
  weekNumber?: number;
  presentTeacherId?: number | null;
  presentTeacher?: Teacher | null;
  createdAt: string;
  updatedAt: string;
  // Optional presence summary included by some endpoints (GET /admin/classes, /admin/classes/:id)
  presences?: Array<{
    id: number;
    eleveId: number;
    statut: 'present' | 'absent' | 'no_status' | 'awaiting';
  }>;
}

export interface Classe {
  id: number;
  nom: string;
  description?: string;
  level?: string;
  typeCours?: string;
  location?: string;
  salle?: string;
  teacherId: number;
  dureeSeance: number;
  semainesSeances: string; // JSON string of week numbers
  jourSemaine?: number; // Default day of week (0=Sunday, 1=Monday, etc.)
  heureDebut?: string; // Default start time (HH:MM format)
  rrPossibles: boolean;
  isRecuperation?: boolean;
  createdAt: string;
  updatedAt: string;
  teacher: Teacher;
  eleves: ClasseEleve[];
  seances: Seance[];
}

export interface CreateClasseData {
  nom: string;
  description?: string;
  level?: string;
  typeCours?: string;
  location?: string;
  salle?: string;
  teacherId: number;
  dureeSeance: number;
  semainesSeances: number[];
  jourSemaine?: number;
  heureDebut?: string;
  rrPossibles?: boolean;
  isRecuperation?: boolean;
  eleveIds?: number[];
}

export interface UpdateClasseData {
  nom?: string;
  description?: string;
  level?: string;
  typeCours?: string;
  location?: string;
  salle?: string;
  teacherId?: number;
  dureeSeance?: number;
  semainesSeances?: number[];
  jourSemaine?: number;
  heureDebut?: string;
  rrPossibles?: boolean;
  isRecuperation?: boolean;
  eleveIds?: number[];
}

export interface CreateSeanceData {
  dateHeure: string;
  duree?: number;
  notes?: string;
  rrPossibles?: boolean;
  weekNumber?: number;
  presentTeacherId?: number | null;
}

export interface UpdateSeanceData {
  dateHeure?: string;
  duree?: number;
  statut?: 'programmee' | 'terminee' | 'annulee';
  notes?: string;
  rrPossibles?: boolean;
  weekNumber?: number;
  presentTeacherId?: number | null;
}

export interface GenerateSeancesData {
  annee: number;
  jourSemaine: number; // 1 = Monday, 2 = Tuesday, etc.
  heureDebut: string; // Format: "HH:MM"
  dureeSeance: number; // Duration in minutes for each generated seance
  nombreSemaines: number; // Number of consecutive weeks to generate
}

class ClassService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // ==================== CLASS METHODS ====================

  async getAllClasses(): Promise<Classe[]> {
    const response = await fetch(`${API_BASE_URL}/admin/classes`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<Classe[]>(response);
  }

  async getClass(id: number): Promise<Classe> {
    const response = await fetch(`${API_BASE_URL}/admin/classes/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<Classe>(response);
  }

  async createClass(data: CreateClasseData): Promise<{ message: string; class: Classe }> {
    const response = await fetch(`${API_BASE_URL}/admin/classes`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ message: string; class: Classe }>(response);
  }

  async updateClass(id: number, data: UpdateClasseData): Promise<{ message: string; class: Classe }> {
    const response = await fetch(`${API_BASE_URL}/admin/classes/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ message: string; class: Classe }>(response);
  }

  async deleteClass(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/classes/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  // ==================== SEANCE METHODS ====================

  async getSeances(classId: number): Promise<Seance[]> {
    const response = await fetch(`${API_BASE_URL}/admin/classes/${classId}/seances`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<Seance[]>(response);
  }

  async createSeance(classId: number, data: CreateSeanceData): Promise<{ message: string; seance: Seance }> {
    const response = await fetch(`${API_BASE_URL}/admin/classes/${classId}/seances`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ message: string; seance: Seance }>(response);
  }

  async updateSeance(id: number, data: UpdateSeanceData): Promise<{ message: string; seance: Seance }> {
    const response = await fetch(`${API_BASE_URL}/admin/seances/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ message: string; seance: Seance }>(response);
  }

  async deleteSeance(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/seances/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async generateSeances(classId: number, data: GenerateSeancesData): Promise<{ message: string; count: number }> {
    const response = await fetch(`${API_BASE_URL}/admin/classes/${classId}/generate-seances`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ message: string; count: number }>(response);
  }

  // ==================== UTILITY METHODS ====================

  parseWeekNumbers(semainesSeances: string): number[] {
    try {
      return JSON.parse(semainesSeances);
    } catch {
      return [];
    }
  }

  formatWeekNumbers(weekNumbers: number[]): string {
    return JSON.stringify(weekNumbers);
  }

  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`;
    }
    return `${remainingMinutes}min`;
  }

  formatDayOfWeek(dayNumber: number): string {
    const days = [
      'Dimanche',
      'Lundi', 
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
      'Samedi'
    ];
    return days[dayNumber] || 'Jour inconnu';
  }

  getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      'programmee': 'Programmée',
      'terminee': 'Terminée',
      'annulee': 'Annulée'
    };
    return statusLabels[status] || status;
  }

  getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      'programmee': 'blue',
      'terminee': 'green',
      'annulee': 'red'
    };
    return statusColors[status] || 'gray';
  }

  getClassStatus(classe: Classe): string {
    const now = new Date();
    const hasUpcomingSeances = classe.seances.some(s => 
      s.statut === 'programmee' && new Date(s.dateHeure) > now
    );
    const hasCompletedSeances = classe.seances.some(s => s.statut === 'terminee');
    const hasCancelledSeances = classe.seances.some(s => s.statut === 'annulee');

    if (hasUpcomingSeances) return 'Active';
    if (hasCompletedSeances && !hasUpcomingSeances) return 'Terminée';
    if (hasCancelledSeances && !hasUpcomingSeances) return 'Annulée';
    return 'Inactive';
  }

  getClassStatusColor(classe: Classe): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    const status = this.getClassStatus(classe);
    const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'Active': 'primary',
      'Terminée': 'success',
      'Annulée': 'error',
      'Inactive': 'default'
    };
    return colorMap[status] || 'default';
  }
}

export const classService = new ClassService();
