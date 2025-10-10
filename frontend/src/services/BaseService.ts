/**
 * Base service class
 * Provides common functionality for all service classes
 */
import { HttpClient, httpClient } from './httpClient';

export abstract class BaseService {
  protected http: HttpClient;
  protected basePath: string;

  constructor(basePath: string, client: HttpClient = httpClient) {
    this.http = client;
    this.basePath = basePath;
  }

  /**
   * Build endpoint URL with base path
   */
  protected endpoint(path: string = ''): string {
    return `${this.basePath}${path}`;
  }

  /**
   * Get all items
   */
  protected async getAll<T>(path: string = ''): Promise<T[]> {
    return this.http.get<T[]>(this.endpoint(path));
  }

  /**
   * Get single item by ID
   */
  protected async getById<T>(id: number | string, path: string = ''): Promise<T> {
    return this.http.get<T>(this.endpoint(`/${id}${path}`));
  }

  /**
   * Create new item
   */
  protected async create<T>(data: any, path: string = ''): Promise<T> {
    return this.http.post<T>(this.endpoint(path), data);
  }

  /**
   * Update item by ID
   */
  protected async update<T>(id: number | string, data: any, path: string = ''): Promise<T> {
    return this.http.put<T>(this.endpoint(`/${id}${path}`), data);
  }

  /**
   * Partially update item by ID
   */
  protected async patch<T>(id: number | string, data: any, path: string = ''): Promise<T> {
    return this.http.patch<T>(this.endpoint(`/${id}${path}`), data);
  }

  /**
   * Delete item by ID
   */
  protected async delete<T>(id: number | string, path: string = ''): Promise<T> {
    return this.http.delete<T>(this.endpoint(`/${id}${path}`));
  }
}
