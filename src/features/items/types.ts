export interface Item {
  id: number;
  title: string;
  content: string;
  score: number;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemPayload {
  title: string;
  content?: string;
  score?: number;
  done?: boolean;
}

export type UpdateItemPayload = Partial<CreateItemPayload>;

export interface ListItemsParams {
  limit?: number;
  offset?: number;
  done?: boolean;
  q?: string;
}
