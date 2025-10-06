// Authentication and API service for user management
import CryptoJS from 'crypto-js';
import { config } from '../config';

const API_URL = config.API_URL;

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    admin: boolean;
    mdpTemporaire: boolean;
  };
  requirePasswordChange?: boolean;
  message?: string;
}

interface User {
  id: number;
  email: string;
  codeitbryan?: string;
  GSM?: string;
  sel?: string;
  admin: boolean;
  actif?: boolean;
  mdpTemporaire: boolean;
  titre?: string;
  fonction?: string;
  nom: string;
  prenom: string;
  niveau?: number;
  revenuQ1?: number;
  revenuQ2?: number;
  entreeFonction?: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          this.user = JSON.parse(userStr);
        } catch (e) {
          localStorage.removeItem('user');
        }
      }
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'include',
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Token is invalid or expired, logout user
        this.logout();
        const error = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error('AUTH_ERROR:' + (error.error || `HTTP ${response.status}`));
      }

      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private generateSalt(): string {
    return CryptoJS.lib.WordArray.random(128/8).toString();
  }

  private hashPassword(password: string, salt: string): string {
    return CryptoJS.SHA256(password + salt).toString();
  }

  async getSalt(email: string): Promise<string> {
    const response = await this.makeRequest('/users/getSalt', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response.salt;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    // First get the salt
    const salt = await this.getSalt(email);
    
    // Hash the password with the salt
    const hashedPassword = this.hashPassword(password, salt);
    
    // Login with hashed password
    const response = await this.makeRequest('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: hashedPassword }),
    });

    if (response.token) {
      this.token = response.token;
      this.user = response.user;
      
      if (typeof window !== 'undefined' && this.token) {
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
      }
    }

    return response;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // Ensure we have a salt for the current user. If the frontend doesn't have it (e.g., hydrated from server without sel), fetch it.
    let salt = this.user?.sel;
    if (!salt) {
      try {
        salt = await this.getSalt(this.user?.email || '');
      } catch (e) {
        // Fallback to generating a new salt for the new password if we can't fetch current salt
        salt = this.generateSalt();
      }
    }

    const hashedCurrentPassword = currentPassword && this.user?.sel ? this.hashPassword(currentPassword, this.user.sel) : '';
    const hashedNewPassword = this.hashPassword(newPassword, salt);

    await this.makeRequest('/users/changePassword', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: hashedCurrentPassword,
        newPassword: hashedNewPassword,
        salt,
      }),
    });

    // Update user to remove temporary password flag
    if (this.user) {
      this.user.mdpTemporaire = false;
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(this.user));
      }
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  isAuthenticated(): boolean {
    // Ensure we're on the client side to avoid hydration mismatches
    if (typeof window === 'undefined') {
      return false;
    }
    return !!this.token && !!this.user;
  }

  isAdmin(): boolean {
    // Ensure we're on the client side to avoid hydration mismatches
    if (typeof window === 'undefined') {
      return false;
    }
    return this.user?.admin || false;
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  async getProfile(): Promise<User> {
    return this.makeRequest('/users/profile');
  }

  requiresPasswordChange(): boolean {
    return this.user?.mdpTemporaire || false;
  }

  // User management methods (now available to all authenticated users)
  async createUser(userData: {
    email: string;
    codeitbryan?: string;
    GSM?: string;
    nom: string;
    prenom: string;
    titre?: string;
    fonction?: string;
    admin?: boolean;
    actif?: boolean;
    niveau?: number;
    entreeFonction?: string;
    revenuQ1?: number;
    revenuQ2?: number;
    password: string;
  }): Promise<User> {
    const salt = this.generateSalt();
    const hashedPassword = this.hashPassword(userData.password, salt);

    return this.makeRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        ...userData,
        mdp: hashedPassword,
        sel: salt,
      }),
    });
  }

  async getAllUsers(): Promise<User[]> {
    // If admin fetch full dataset, else limited non-confidential list
    if (this.isAdmin()) {
      return this.makeRequest('/admin/users');
    }
    return this.makeRequest('/users');
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    return this.makeRequest(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async resetUserPassword(id: number, newPassword: string): Promise<void> {
    const salt = this.generateSalt();
    const hashedPassword = this.hashPassword(newPassword, salt);

    return this.makeRequest(`/admin/users/${id}/resetPassword`, {
      method: 'POST',
      body: JSON.stringify({
        newPassword: hashedPassword,
        salt,
      }),
    });
  }

  async resetUserPasswordWithResponse(id: number, newPassword: string): Promise<any> {
    const salt = this.generateSalt();
    const hashedPassword = this.hashPassword(newPassword, salt);
    return this.makeRequest(`/admin/users/${id}/resetPassword`, {
      method: 'POST',
      body: JSON.stringify({ newPassword: hashedPassword, salt }),
    });
  }

  async activateUser(id: number): Promise<void> {
    return this.makeRequest(`/admin/users/${id}/activate`, {
      method: 'PUT',
    });
  }

  async deactivateUser(id: number): Promise<void> {
    // Backend expects admin route for deactivate
    return this.makeRequest(`/admin/users/${id}/deactivate`, {
      method: 'PUT',
    });
  }

  async bulkResetPasswords(ids: number[]): Promise<{ success: number; failed: number; }> {
    let success = 0, failed = 0;
    for (const id of ids) {
      try {
        // Call reset without body to trigger default password behavior
        await this.makeRequest(`/admin/users/${id}/resetPassword`, { method: 'POST', body: JSON.stringify({}) });
        success++;
      } catch (e) {
        failed++;
      }
    }
    return { success, failed };
  }

  async deleteUser(id: number): Promise<void> {
    return this.makeRequest(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getUserProfile(): Promise<User> {
    return this.makeRequest('/users/profile');
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await this.makeRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });

    // Update local user data
    if (this.user) {
      this.user = { ...this.user, ...response.user };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(this.user));
      }
    }

    return response.user;
  }

  // Statistics methods
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    tempPasswordUsers: number;
  }> {
    const users = await this.getAllUsers();
    return {
      totalUsers: users.length,
      activeUsers: users.length,
      adminUsers: users.filter(u => u.admin).length,
      tempPasswordUsers: users.filter(u => u.mdpTemporaire).length,
    };
  }
}

// Export a singleton instance
export const authService = new AuthService();
export default authService;
export type { User, LoginResponse };
