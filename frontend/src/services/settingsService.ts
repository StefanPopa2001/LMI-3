import { config } from '../config';

const API_BASE_URL = config.API_URL;

export interface Setting {
  id: number;
  category: string;
  value: string;
  label?: string;
  description?: string;
  order?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedSettings {
  [category: string]: Setting[];
}

export interface CreateSettingData {
  category: string;
  value: string;
  label?: string;
  description?: string;
  order?: number;
}

export interface UpdateSettingData {
  value?: string;
  label?: string;
  description?: string;
  order?: number;
  active?: boolean;
}

class SettingsService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getAllSettings(): Promise<GroupedSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  async getSettingsByCategory(category: string): Promise<Setting[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings/${category}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error(`Failed to fetch settings for category ${category}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching settings for category ${category}:`, error);
      throw error;
    }
  }

  async createSetting(data: CreateSettingData): Promise<Setting> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create setting: ${response.statusText}`);
      }

      const result = await response.json();
      return result.setting;
    } catch (error) {
      console.error('Error creating setting:', error);
      throw error;
    }
  }

  async updateSetting(id: number, data: UpdateSettingData): Promise<Setting> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update setting: ${response.statusText}`);
      }

      const result = await response.json();
      return result.setting;
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  }

  async deleteSetting(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete setting: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting setting:', error);
      throw error;
    }
  }

}

export const settingsService = new SettingsService();
