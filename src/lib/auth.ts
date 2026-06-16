export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  isTokenExpired(): boolean {
    const expiresIn = localStorage.getItem("expires_in");
    const tokenTimestamp = localStorage.getItem("token_timestamp");
    if (!expiresIn || !tokenTimestamp) return true;
    return Date.now() >= parseInt(tokenTimestamp) + parseInt(expiresIn) * 1000;
  }

  getValidToken(): string | null {
    if (this.isTokenExpired()) { this.clearAuthData(); return null; }
    return localStorage.getItem("access_token");
  }

  storeTokens(accessToken: string, refreshToken: string, tokenType: string, expiresIn: number): void {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("token_type", tokenType);
    localStorage.setItem("expires_in", expiresIn.toString());
    localStorage.setItem("token_timestamp", Date.now().toString());
  }

  clearAuthData(): void {
    ["access_token", "refresh_token", "token_type", "expires_in", "token_timestamp", "admin_user"]
      .forEach(k => localStorage.removeItem(k));
  }

  isAuthenticated(): boolean {
    return !!(this.getValidToken() && localStorage.getItem("admin_user"));
  }
}

export const authService = AuthService.getInstance();
