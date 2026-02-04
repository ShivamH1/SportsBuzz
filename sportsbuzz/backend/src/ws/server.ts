import WebSocket, { WebSocketServer, type Server } from "ws";
import type { Match, Commentary } from "../db/schema";
import { incomingMessageToFetchRequest, wsArcjet } from "../arcjet";

const WS_PATH = "/ws";

const matchSubscribers = new Map();

function subscribe(matchId: number, socket: WebSocket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId)!.add(socket);
}

function unsubscribe(matchId: number, socket: WebSocket) {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscription(socket: WebSocket) {
  const extWs = socket as ExtendedWebSocket;
  if (extWs.subscriptions) {
    for (const matchId of extWs.subscriptions) {
      unsubscribe(matchId, socket);
    }
  }
}

function sendJson(socket: WebSocket, payload: any) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss: Server, payload: any) {
  wss.clients.forEach((socket: WebSocket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  });
}

function broadcastToMatch(matchId: number, payload: any) {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function handleMessage(socket: WebSocket, data: any) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    sendJson(socket, {
      type: "error",
      message: "Invalid message format",
    });
    return;
  }

  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    const extWs = socket as ExtendedWebSocket;
    subscribe(message.matchId, socket);
    extWs.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }

  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    const extWs = socket as ExtendedWebSocket;
    unsubscribe(message.matchId, socket);
    extWs.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
    return;
  }
}

// Extend WebSocket type to support isAlive and subscriptions
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  subscriptions: Set<number>;
}

/** Return type of {@link attachWebSocketServer}: object with broadcast helpers. */
export type WebSocketServerHandle = {
  broadcastMatchCreated: (match: Match) => void;
  broadcastMatchUpdated: (id: number, updates: Partial<Match>) => void;
  broadcastCommentary: (matchId: number, commentary: Commentary) => void;
};

/**
 * Attaches a WebSocket server to an existing HTTP or HTTPS server.
 * Protection runs in the server 'upgrade' handler (before handshake); on success
 * handleUpgrade is called and connection is emitted without any protection call.
 */
export function attachWebSocketServer(
  server: import("http").Server | import("https").Server,
): WebSocketServerHandle {
  const wss = new WebSocketServer({
    server,
    path: WS_PATH,
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", async (socket: WebSocket, req) => {
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(
          incomingMessageToFetchRequest(req),
        );
        if (decision.isDenied()) {
          socket.send(
            JSON.stringify({
              type: "error",
              message: decision.reason.isRateLimit()
                ? "Rate Limit Exceeded"
                : "Access Denied",
            }),
          );
          socket.close(1008, "Policy Violation");
          return;
        }
      } catch (error) {
        console.error("WS connection protection error:", error);
        // Continue for now or close if security is paramount
      }
    }

    const hbSocket = socket as ExtendedWebSocket;

    hbSocket.isAlive = true;
    hbSocket.on("pong", () => {
      hbSocket.isAlive = true;
    });

    hbSocket.subscriptions = new Set();

    sendJson(hbSocket, {
      type: "welcome",
      message: "Welcome to the WebSocket server",
    });

    hbSocket.on("error", console.error);

    hbSocket.on("message", (data) => {
      handleMessage(hbSocket, data);
    });

    hbSocket.on("error", (error) => {
      console.error("WebSocket error:", error);
      hbSocket.terminate();
    });

    hbSocket.on("close", () => {
      cleanupSubscription(hbSocket);
    });
  });

  // Set up an interval to regularly check if clients are alive (heartbeat mechanism)
  // Every 30 seconds, for each client: if it hasn't responded to last ping, terminate it;
  // otherwise, send a ping and mark it as not alive, waiting for pong.
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const hbWs = ws as ExtendedWebSocket;
      if (hbWs.isAlive === false) {
        return hbWs.terminate();
      }
      hbWs.isAlive = false;
      hbWs.ping();
    });
  }, 30000);

  // Clear the heartbeat interval when the server closes
  wss.on("close", () => {
    clearInterval(interval);
  });

  /**
   * Broadcasts a 'match_created' event to all connected clients.
   * @param match - The match object to send.
   */
  function broadcastMatchCreated(match: Match) {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  /**
   * Broadcasts a 'commentary' event to all connected clients.
   * @param matchId - The match ID to send the commentary to.
   * @param commentary - The commentary to send.
   */
  function broadcastMatchUpdated(id: number, updates: Partial<Match>) {
    broadcastToAll(wss, { type: "match_updated", data: { ...updates, id } });
  }

  function broadcastCommentary(matchId: number, data: Commentary) {
    broadcastToMatch(matchId, { type: "commentary", data });
  }

  // Return the broadcasting function for use elsewhere in the app
  return { broadcastMatchCreated, broadcastMatchUpdated, broadcastCommentary };
}
