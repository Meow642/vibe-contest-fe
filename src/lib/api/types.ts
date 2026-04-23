export interface ApiErrorBody {
  error: string;
}

export interface Paginated<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

export class ApiError extends Error {
  readonly status?: number;
  readonly raw?: unknown;

  constructor(message: string, status?: number, raw?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.raw = raw;
  }
}
