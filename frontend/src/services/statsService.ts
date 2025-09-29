import authService from './authService';
import { config } from '../config';

export interface LevelStats {
  level: string;
  totalPresences: number;
  presentCount: number;
  presentPercentage: number;
}

export interface TeacherStats {
  teacherId: number;
  teacherName: string;
  totalPresences: number;
  presentCount: number;
  presentPercentage: number;
}

export interface StatsData {
  levelStats: LevelStats[];
  teacherStats: TeacherStats[];
}

class StatsService {
  private baseURL: string;

  constructor() {
    this.baseURL = config.API_URL || 'http://localhost:4000';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Token is invalid or expired, logout user
        authService.logout();
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error('AUTH_ERROR:' + (errorData.error || `HTTP ${response.status}`));
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getStats(): Promise<StatsData> {
    return this.makeRequest('/admin/stats');
  }
}

const statsService = new StatsService();
export default statsService;
