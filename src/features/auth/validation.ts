const USERNAME_PATTERN = /^[A-Za-z0-9_.@-]{3,30}$/;
const HTTP_URL_PATTERN = /^https?:\/\/.+$/;

export interface AuthFieldErrors {
  username?: string;
  password?: string;
  displayName?: string;
  avatarUrl?: string;
  form?: string;
}

export function normalizeUsername(value: string) {
  return value.trim();
}

export function validateUsername(value: string) {
  if (!USERNAME_PATTERN.test(value)) {
    return "username must be 3-30 chars of [A-Za-z0-9_.@-]";
  }

  return undefined;
}

export function validatePassword(value: string) {
  if (value.length < 6 || value.length > 30) {
    return "password must be 6-30 chars";
  }

  return undefined;
}

export function validateDisplayName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length < 1 || trimmed.length > 30) {
    return "displayName must be 1-30 chars";
  }

  return undefined;
}

export function validateAvatarUrl(value: string) {
  if (!value) {
    return undefined;
  }

  if (value.length > 500 || !HTTP_URL_PATTERN.test(value)) {
    return "avatarUrl must be a valid http(s) url or empty";
  }

  return undefined;
}

export function mapAuthApiError(message: string): AuthFieldErrors {
  switch (message) {
    case "username must be 3-30 chars of [A-Za-z0-9_.@-]":
      return { username: message };
    case "password must be 6-30 chars":
      return { password: message };
    case "displayName must be 1-30 chars":
      return { displayName: message };
    case "avatarUrl must be a valid http(s) url or empty":
      return { avatarUrl: message };
    case "username already exists":
      return { username: "该账号已存在" };
    case "invalid username or password":
      return { password: "账号密码错误！" };
    default:
      return { form: message };
  }
}
