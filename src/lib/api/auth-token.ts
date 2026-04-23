export type AuthTokenStorage = "local" | "session";

const TOKEN_KEY = "vc.token";

function getStorage(storage: AuthTokenStorage) {
  if (typeof window === "undefined") {
    return null;
  }

  return storage === "local" ? window.localStorage : window.sessionStorage;
}

function readToken(storage: AuthTokenStorage) {
  return getStorage(storage)?.getItem(TOKEN_KEY) ?? null;
}

export const authToken = {
  get() {
    return readToken("local") ?? readToken("session");
  },

  has() {
    return Boolean(this.get());
  },

  set(token: string, storage: AuthTokenStorage = "local") {
    this.clear();
    getStorage(storage)?.setItem(TOKEN_KEY, token);
  },

  clear() {
    getStorage("local")?.removeItem(TOKEN_KEY);
    getStorage("session")?.removeItem(TOKEN_KEY);
  },
};
