import authService from './authService';

interface DriveFile { name: string; size: number; lastModified?: string; }

class DriveService {
  private baseURL: string;
  constructor() { this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'; }

  private async request(path: string, options: RequestInit = {}) {
    const token = authService.getToken();
    if (!token) throw new Error('No auth');
    const res = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async list(): Promise<DriveFile[]> {
    const data = await this.request('/admin/drive');
    return data.files || [];
  }

  async upload(file: File): Promise<void> {
    const token = authService.getToken();
    if (!token) throw new Error('No auth');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${this.baseURL}/admin/drive/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });
    if (!res.ok) throw new Error('Upload failed');
  }

  async getDownloadUrl(name: string): Promise<string> {
    const data = await this.request(`/admin/drive/download/${encodeURIComponent(name)}`);
    return data.url;
  }

  async delete(name: string): Promise<void> {
    await this.request(`/admin/drive/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }
}

export const driveService = new DriveService();
export type { DriveFile };
