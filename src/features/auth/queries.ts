import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authToken, type AuthTokenStorage } from "@/lib/api/auth-token";
import { authApi, authKeys } from "./api";
import type { LoginPayload, RegisterPayload } from "./types";

interface AuthMutationOptions {
  storage?: AuthTokenStorage;
}

export interface LoginFormPayload extends LoginPayload, AuthMutationOptions {}

export interface RegisterFormPayload extends RegisterPayload, AuthMutationOptions {}

export function useAuthMeQuery() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    enabled: authToken.has(),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginFormPayload) =>
      authApi.login({
        username: payload.username,
        password: payload.password,
      }),
    onSuccess: (session, variables) => {
      authToken.set(session.token, variables.storage ?? "local");
      queryClient.setQueryData(authKeys.me, session.user);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterFormPayload) =>
      authApi.register({
        username: payload.username,
        password: payload.password,
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
      }),
    onSuccess: (session, variables) => {
      authToken.set(session.token, variables.storage ?? "local");
      queryClient.setQueryData(authKeys.me, session.user);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      authToken.clear();
      queryClient.setQueryData(authKeys.me, null);
      queryClient.invalidateQueries();
    },
  });
}
