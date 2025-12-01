// client/services/userService.ts
import { apiClient } from "./api";

export interface UserDto {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  created_at?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  is_admin: boolean;
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  // Mot de passe optionnel en mise à jour
  password?: string;
  is_admin: boolean;
}

// Transforme un objet brut venant de l'API en UserDto
const fromApi = (u: any): UserDto => ({
  id: u.id,
  name: u.name,
  email: u.email,
  is_admin: !!u.is_admin,
  created_at: u.created_at,
});

export const userService = {
  async list(): Promise<UserDto[]> {
    const res = await apiClient.get<UserDto[]>("/users");
    // On remappe pour être sûr d'avoir toujours un id
    return res.data.map(fromApi);
  },

  async create(payload: CreateUserPayload): Promise<UserDto> {
    const res = await apiClient.post<UserDto>("/users", payload);
    return fromApi(res.data);
  },

  async update(id: number, payload: UpdateUserPayload): Promise<UserDto> {
    if (!id) {
      throw new Error("ID utilisateur manquant pour la mise à jour");
    }
    const res = await apiClient.put<UserDto>(`/users/${id}`, payload);
    return fromApi(res.data);
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
