// client/services/authService.ts
import { apiClient } from "./api";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean; // ajout du rôle
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

// Fonction interne pour nettoyer le stockage local
function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const authService = {
  /**
   * Login : envoie email + password à /login
   * et stocke le token + l'utilisateur en localStorage.
   */
  async login(email: string, password: string): Promise<AuthUser> {
    const response = await apiClient.post<LoginResponse>("/login", {
      email,
      password,
    });

    const { token, user } = response.data;

    // Stocker token + user en local
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return user;
  },

  /**
   * Logout : appelle /logout puis nettoie le stockage local,
   * même en cas d'erreur réseau.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post("/logout");
    } catch (e) {
      // Ce n'est pas bloquant si l'appel réseau échoue
      console.error("Erreur lors du logout", e);
    } finally {
      clearAuthStorage();
    }
  },

  /**
   * Nettoie complètement les infos d'authentification.
   */
  clearAuth(): void {
    clearAuthStorage();
  },

  /**
   * Retourne le token brut (ou null).
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Retourne l'utilisateur courant depuis le localStorage (ou null).
   */
  getCurrentUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch (err) {
      console.error("Erreur de parsing de l'utilisateur courant", err);
      return null;
    }
  },

  /**
   * Vérifie si un token est présent.
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Récupère l'utilisateur courant depuis l'API (route /me)
   * et met à jour le localStorage si succès.
   */
  async refreshCurrentUser(): Promise<AuthUser | null> {
    try {
      const res = await apiClient.get<AuthUser>("/me");
      const user = res.data;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch (err) {
      console.error("Erreur lors de la récupération de /me", err);
      return null;
    }
  },
};
