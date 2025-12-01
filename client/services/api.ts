// client/services/api.ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1",
});

// Intercepteur pour ajouter automatiquement le token Authorization
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (token) {
    // On s'assure que headers existe
    config.headers = config.headers ?? {};
    // On ajoute le header Authorization
    (config.headers as any)["Authorization"] = `Bearer ${token}`;
  }

  return config;
});
