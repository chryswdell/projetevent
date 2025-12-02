// client/services/api.ts
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL,
});

// Intercepteur pour ajouter automatiquement le token Authorization
apiClient.interceptors.request.use((config) => {
  // S'assurer que les headers existent
  config.headers = config.headers ?? {};

  // ✅ Bypass de la page d'avertissement ngrok
  (config.headers as any)["ngrok-skip-browser-warning"] = "true";

  // ✅ Ajout du token si présent
  const token = localStorage.getItem("auth_token");
  if (token) {
    (config.headers as any)["Authorization"] = `Bearer ${token}`;
  }

  return config;
});
