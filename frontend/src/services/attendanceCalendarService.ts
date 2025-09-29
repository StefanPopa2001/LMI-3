import { config } from '../config';

const API_BASE_URL = config.API_URL || 'http://localhost:4000';

export interface AttendanceDayDTO { id: number; date: string; }

class AttendanceCalendarService {
  private async headers() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  async getYear(year: number): Promise<AttendanceDayDTO[]> {
    const res = await fetch(`${API_BASE_URL}/admin/attendance/calendar/${year}`, {
      method: 'GET', headers: await this.headers(),
    });
    if (!res.ok) throw new Error('Failed to load calendar');
    return res.json();
  }

  async toggle(date: string, active: boolean): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/admin/attendance/calendar/toggle`, {
      method: 'PUT', headers: await this.headers(),
      body: JSON.stringify({ date, active })
    });
    if (!res.ok) throw new Error('Failed to toggle day');
  }

  async reset(year: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/admin/attendance/calendar/reset/${year}`, {
      method: 'POST', headers: await this.headers(),
    });
    if (!res.ok) throw new Error('Failed to reset calendar');
  }
}

export const attendanceCalendarService = new AttendanceCalendarService();
export default attendanceCalendarService;
