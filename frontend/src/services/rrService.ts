const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface RRItem {
  id: number;
  eleveId: number;
  originSeanceId: number;
  destinationSeanceId: number;
  status: 'open' | 'completed' | 'cancelled';
  destStatut: 'present' | 'absent' | 'no_status';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

class RrService {
  private async getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async createRR(payload: { eleveId: number; originSeanceId: number; destinationSeanceId: number; notes?: string }): Promise<{ message: string; rr: RRItem }> {
    const response = await fetch(`${API_BASE_URL}/admin/rr`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to create RR');
    return response.json();
  }

  async listRR(): Promise<RRItem[]> {
    const response = await fetch(`${API_BASE_URL}/admin/rr`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load RRs');
    return response.json();
  }

  async getRR(id: number): Promise<RRItem> {
    const response = await fetch(`${API_BASE_URL}/admin/rr/${id}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load RR');
    return response.json();
  }

  async updateRR(id: number, data: Partial<Pick<RRItem, 'status' | 'notes'>>): Promise<{ message: string; rr: RRItem }> {
    const response = await fetch(`${API_BASE_URL}/admin/rr/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update RR');
    return response.json();
  }
}

export const rrService = new RrService();
export default rrService;
