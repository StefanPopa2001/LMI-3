import authService from './authService';

export interface DriveFile { name: string; path: string; size: number; lastModified?: string; }
export interface DriveListResponse { prefix: string; folders: string[]; files: DriveFile[]; }

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

  private qs(params: Record<string, any>): string {
    const q = Object.entries(params)
      .filter(([,v]) => v !== undefined && v !== null && v !== '')
      .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return q ? `?${q}` : '';
  }

  async list(prefix: string = ''): Promise<DriveListResponse> {
    return this.request(`/admin/drive${this.qs({ prefix })}`);
  }

  async createFolder(path: string, name: string): Promise<void> {
    await this.request('/admin/drive/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, name })
    });
  }

  async deleteFolder(prefix: string): Promise<void> {
    await this.request(`/admin/drive/folder${this.qs({ prefix })}`, { method: 'DELETE' });
  }

  async upload(file: File, path: string = ''): Promise<void> {
    const token = authService.getToken();
    if (!token) throw new Error('No auth');
    const form = new FormData();
    form.append('file', file);
    form.append('path', path);
    const res = await fetch(`${this.baseURL}/admin/drive/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });
    if (!res.ok) throw new Error('Upload failed');
  }

  async getDownloadUrl(key: string): Promise<string> {
    const data = await this.request(`/admin/drive/download/${encodeURIComponent(key)}`);
    return data.url;
  }

  async deleteObject(key: string): Promise<void> {
    await this.request(`/admin/drive/${encodeURIComponent(key)}`, { method: 'DELETE' });
  }

  async preview(key: string): Promise<{ type: 'text'; truncated: boolean; content: string } | { type: 'binary'; url: string }> {
    return this.request(`/admin/drive/preview${this.qs({ key })}`);
  }
}

export const driveService = new DriveService();
