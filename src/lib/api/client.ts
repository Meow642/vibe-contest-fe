import axios from "axios";
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { toast } from "sonner";
import { ApiError, type ApiErrorBody } from "./types";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "http://localhost:3000",
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // 预留：未来接入鉴权后在此注入 Authorization
  // const token = getToken();
  // if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiErrorBody>) => {
    const status = err.response?.status;
    const message =
      err.response?.data?.error ?? err.message ?? "网络错误";

    if (status === 401) {
      // TODO: 跳转登录
    } else if (status === 403) {
      toast.error("没有权限执行该操作");
    } else if (status === 500) {
      toast.error("服务器开小差了");
    } else if (!status) {
      // 无响应：网络/超时/CORS
      toast.error(message);
    }

    return Promise.reject(new ApiError(message, status, err));
  },
);

async function unwrap<T>(p: Promise<AxiosResponse<T>>): Promise<T> {
  const res = await p;
  // DELETE 返回 204，data 为 ''；按 null 返回
  return res.status === 204 ? (null as T) : res.data;
}

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    unwrap<T>(api.get<T>(url, config)),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(api.post<T>(url, data ?? {}, config)),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(api.put<T>(url, data ?? {}, config)),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(api.patch<T>(url, data ?? {}, config)),
  delete: <T = null>(url: string, config?: AxiosRequestConfig) =>
    unwrap<T>(api.delete<T>(url, config)),
};
