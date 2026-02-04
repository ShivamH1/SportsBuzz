import { WS_URL } from "@/config";
import type {
  ServerMessage,
  ClientMessage,
  ServerMessageType,
} from "@/types/sports";

type MessageCallback = (data: any) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1s
  private isManuallyClosed = false;
  private listeners: Map<
    ServerMessageType | "all" | "open" | "close" | "error",
    Set<MessageCallback>
  > = new Map();
  private subscriptions: Set<number> = new Set();
  private pendingMessages: string[] = [];

  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  public connect() {
    this.isManuallyClosed = false;
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.listeners.get("open")?.forEach((cb) => cb(null));

      // Resubscribe to existing matches on reconnections
      this.subscriptions.forEach((matchId) => {
        this.send({ type: "subscribe", matchId });
      });

      // Send any messages queued while offline
      while (this.pendingMessages.length > 0) {
        const msg = this.pendingMessages.shift();
        if (msg) this.socket?.send(msg);
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (err) {
        console.error("WS: Failed to parse message", err);
      }
    };

    this.socket.onclose = (event) => {
      this.listeners.get("close")?.forEach((cb) => cb(event));
      if (!this.isManuallyClosed) {
        console.warn(
          `WS: Connection lost. Reconnecting in ${this.reconnectDelay}ms...`,
          event.reason,
        );
        this.attemptReconnect();
      }
    };

    this.socket.onerror = (error) => {
      this.listeners.get("error")?.forEach((cb) => cb(error));
      console.error("WS: Socket error", error);
      this.socket?.close();
    };
  }

  public disconnect() {
    this.isManuallyClosed = true;
    this.socket?.close();
    this.socket = null;
  }

  public subscribe(matchId: number) {
    this.subscriptions.add(matchId);
    this.send({ type: "subscribe", matchId });
  }

  public unsubscribe(matchId: number) {
    this.subscriptions.delete(matchId);
    this.send({ type: "unsubscribe", matchId });
  }

  public on(
    type: ServerMessageType | "all" | "open" | "close" | "error",
    callback: MessageCallback,
  ) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => this.off(type, callback);
  }

  public off(
    type: ServerMessageType | "all" | "open" | "close" | "error",
    callback: MessageCallback,
  ) {
    this.listeners.get(type)?.delete(callback);
  }

  private handleMessage(message: ServerMessage) {
    // Notify type-specific listeners
    this.listeners.get(message.type)?.forEach((cb) => cb(message));
    // Notify 'all' listeners
    this.listeners.get("all")?.forEach((cb) => cb(message));
  }

  private send(message: ClientMessage) {
    const data = JSON.stringify(message);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    } else {
      this.pendingMessages.push(data);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("WS: Max reconnection attempts reached.");
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30s delay
      this.connect();
    }, this.reconnectDelay);
  }
}

export const wsClient = new WebSocketClient(WS_URL);
