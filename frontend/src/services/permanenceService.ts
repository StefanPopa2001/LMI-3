import { config } from '../config';

const API_BASE_URL = config.API_URL || 'http://localhost:4000';

export interface PermanenceSlot {
  id: number;
  dayOfWeek: number; // 0..6
  period: 'AM' | 'PM';
  userId?: number | null;
  notes?: string | null;
  user?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
  } | null;
}

class PermanenceService {
  private async getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  async getWeeklyPermanence(): Promise<PermanenceSlot[]> {
    const res = await fetch(`${API_BASE_URL}/permanence/week`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch permanence');
    return res.json();
  }

  async updateSlot(dayOfWeek: number, period: 'AM' | 'PM', userId?: number | null, notes?: string | null): Promise<PermanenceSlot> {
    const res = await fetch(`${API_BASE_URL}/admin/permanence/slot`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ dayOfWeek, period, userId, notes }),
    });
    if (!res.ok) throw new Error('Failed to update slot');
    const data = await res.json();
    return data.slot as PermanenceSlot;
  }
}

export const permanenceService = new PermanenceService();
export default permanenceService;
