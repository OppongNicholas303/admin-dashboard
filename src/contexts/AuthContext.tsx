import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AuthUser, LoginCredentials } from "@/types";
import { API_BASE } from "@/lib/api";
import { authService } from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("admin_user");
      if (stored && authService.isAuthenticated()) {
        const parsed: AuthUser = JSON.parse(stored);
        if (parsed.roles?.includes("ROLE_ADMIN")) setUser(parsed);
        else authService.clearAuthData();
      } else {
        authService.clearAuthData();
      }
    } catch {
      authService.clearAuthData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.clearAuthData();
    setUser(null);
  }, []);

  const login = useCallback(async ({ username, password }: LoginCredentials): Promise<void> => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const text = await response.text();
    let data: { success?: boolean; message?: string; data?: { accessToken?: string; refreshToken?: string; tokenType?: string; expiresIn?: number; user?: AuthUser } };
    try { data = JSON.parse(text); } catch { throw new Error("Unexpected server response."); }

    if (!response.ok || !data.success) throw new Error(data?.message || `Login failed (${response.status})`);

    const { accessToken, refreshToken, tokenType, expiresIn, user: userData } = data.data ?? {};
    if (!accessToken || !userData) throw new Error("Invalid response from server.");

    if (!userData.roles?.includes("ROLE_ADMIN")) {
      throw new Error("Access denied. Admin privileges required.");
    }

    authService.storeTokens(accessToken, refreshToken ?? "", tokenType ?? "Bearer", typeof expiresIn === "number" ? expiresIn : 1800);
    localStorage.setItem("admin_user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
