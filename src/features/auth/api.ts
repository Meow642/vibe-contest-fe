import { http } from "@/lib/api";
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
  User,
} from "./types";

export const authApi = {
  register: (payload: RegisterPayload) =>
    http.post<AuthSession>("/auth/register", payload),

  login: (payload: LoginPayload) => http.post<AuthSession>("/auth/login", payload),

  me: () => http.get<User>("/auth/me"),

  logout: () => http.post<null>("/auth/logout", {}),
};

export const authKeys = {
  all: ["auth"] as const,
  me: ["auth", "me"] as const,
};
