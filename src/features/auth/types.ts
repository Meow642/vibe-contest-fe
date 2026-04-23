export interface User {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: User;
}

export interface RegisterPayload {
  username: string;
  password: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}
