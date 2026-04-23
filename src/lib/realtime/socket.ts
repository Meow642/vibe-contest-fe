import { authToken } from "@/lib/api/auth-token";
import type {
  RealtimeClientEvent,
  RealtimeServerEvent,
  RealtimeStatusEvent,
} from "./types";

type EventHandler = (event: RealtimeServerEvent) => void;
type StatusHandler = (event: RealtimeStatusEvent) => void;

export class RealtimeSocket {
  private backoff = 1000;
  private consumerCount = 0;
  private currentUrl: string | null = null;
  private generation = 0;
  private listeners = new Set<EventHandler>();
  private reconnectTimer: number | null = null;
  private statusListeners = new Set<StatusHandler>();
  private ws: WebSocket | null = null;

  acquire() {
    this.consumerCount += 1;
    this.ensureConnected();
  }

  ensureConnected(force = false) {
    if (this.consumerCount === 0) {
      return;
    }

    const url = this.buildUrl();

    if (
      !force &&
      this.ws &&
      this.currentUrl === url &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.generation += 1;
    const generation = this.generation;

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, "reconnect");
      this.ws = null;
    }

    const ws = new WebSocket(url);
    this.currentUrl = url;
    this.ws = ws;

    ws.onopen = () => {
      if (generation !== this.generation) {
        return;
      }

      this.backoff = 1000;
      this.statusListeners.forEach((listener) => listener({ kind: "open" }));
    };

    ws.onmessage = (event) => {
      if (generation !== this.generation) {
        return;
      }

      try {
        const parsed = JSON.parse(event.data) as RealtimeServerEvent;
        this.listeners.forEach((listener) => listener(parsed));
      } catch {
        // ignore malformed frames from proxies or non-json noise
      }
    };

    ws.onclose = (event) => {
      if (generation !== this.generation) {
        return;
      }

      this.ws = null;
      this.statusListeners.forEach((listener) =>
        listener({
          code: event.code,
          kind: "close",
          reason: event.reason,
        }),
      );

      if (event.code === 4401) {
        authToken.clear();
      }

      if (this.consumerCount === 0 || event.code === 4400) {
        return;
      }

      this.reconnectTimer = window.setTimeout(() => {
        this.ensureConnected(true);
      }, this.backoff);

      this.backoff = Math.min(this.backoff * 2, 30_000);
    };
  }

  on(listener: EventHandler) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusHandler) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  reconnect() {
    this.ensureConnected(true);
  }

  release() {
    this.consumerCount = Math.max(0, this.consumerCount - 1);

    if (this.consumerCount > 0) {
      return;
    }

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.generation += 1;
    this.currentUrl = null;
    this.ws?.close(1000, "release");
    this.ws = null;
  }

  send<T extends RealtimeClientEvent["type"]>(
    type: T,
    data: Extract<RealtimeClientEvent, { type: T }>["data"],
  ) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({ type, data }));
  }

  private buildUrl() {
    const base =
      import.meta.env.VITE_API_BASE ??
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    const wsBase = base.replace(/^http/, "ws").replace(/\/$/, "");
    const token = authToken.get();

    return token
      ? `${wsBase}/ws?token=${encodeURIComponent(token)}`
      : `${wsBase}/ws`;
  }
}

export const socket = new RealtimeSocket();
