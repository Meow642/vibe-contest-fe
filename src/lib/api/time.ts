/**
 * 后端时间格式 `YYYY-MM-DD HH:mm:ss`（UTC，空格分隔），非 ISO 8601。
 */
export const parseServerTime = (s: string): Date =>
  new Date(s.replace(" ", "T") + "Z");
