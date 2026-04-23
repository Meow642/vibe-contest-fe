import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { itemsApi, itemsKeys } from "./api";
import type {
  CreateItemPayload,
  ListItemsParams,
  UpdateItemPayload,
} from "./types";

export function useItemsQuery(params: ListItemsParams) {
  return useQuery({
    queryKey: itemsKeys.list(params),
    queryFn: () => itemsApi.list(params),
  });
}

export function useCreateItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateItemPayload) => itemsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemsKeys.all });
    },
  });
}

export function useUpdateItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateItemPayload }) =>
      itemsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemsKeys.all });
    },
  });
}

export function useDeleteItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => itemsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemsKeys.all });
    },
  });
}
