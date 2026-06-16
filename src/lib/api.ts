import { authService } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

class ApiClient {
  private baseURL: string;
  constructor(baseURL: string) { this.baseURL = baseURL; }

  private getAuthHeaders(): HeadersInit {
    const token = authService.getValidToken();
    const tokenType = localStorage.getItem("token_type") || "Bearer";
    return token
      ? { Authorization: `${tokenType} ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }

  private async handleResponse(response: Response): Promise<unknown> {
    if (response.status === 401) {
      authService.clearAuthData();
      window.location.href = "/login";
      throw new Error("Authentication required");
    }
    if (response.status === 403) throw new Error("Access denied. Admin role required.");
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error((err as { message?: string }).message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async get(endpoint: string): Promise<unknown> {
    const res = await fetch(`${this.baseURL}${endpoint}`, {
      method: "GET", headers: this.getAuthHeaders(),
    });
    return this.handleResponse(res);
  }

  async post(endpoint: string, data?: unknown): Promise<unknown> {
    const res = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST", headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse(res);
  }

  async put(endpoint: string, data?: unknown): Promise<unknown> {
    const res = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PUT", headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse(res);
  }

  async delete(endpoint: string): Promise<unknown> {
    const res = await fetch(`${this.baseURL}${endpoint}`, {
      method: "DELETE", headers: this.getAuthHeaders(),
    });
    return this.handleResponse(res);
  }
}

export const apiClient = new ApiClient(API_BASE);
export { API_BASE };
