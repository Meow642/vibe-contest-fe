import { http, type Paginated } from "@/lib/api";
import type {
  CreateItemPayload,
  Item,
  ListItemsParams,
  UpdateItemPayload,
} from "./types";

export const itemsApi = {
  list: (params: ListItemsParams = {}) =>
    http.get<Paginated<Item>>("/items", { params }),

  get: (id: number) => http.get<Item>(`/items/${id}`),

  create: (payload: CreateItemPayload) => http.post<Item>("/items", payload),

  update: (id: number, payload: UpdateItemPayload) =>
    http.put<Item>(`/items/${id}`, payload),

  remove: (id: number) => http.delete(`/items/${id}`),
};

export const itemsKeys = {
  all: ["items"] as const,
  list: (params: ListItemsParams) => ["items", "list", params] as const,
  detail: (id: number) => ["items", "detail", id] as const,
};
