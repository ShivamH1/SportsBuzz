import WebSocket, { WebSocketServer, type Server } from "ws";
import type { Match } from "../db/schema";
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

/** Write a minimal HTTP error response on the raw socket and destroy it. */
function rejectUpgrade(
  socket: import("net").Socket,
  statusCode: number,
  statusMessage: string,
  body?: string,
) {
  const msg = body ?? statusMessage;
  socket.write(
    `HTTP/1.1 ${statusCode} ${statusMessage}\r\n` +
      "Content-Type: text/plain\r\n" +
      `Content-Length: ${Buffer.byteLength(msg, "utf8")}\r\n` +
      "Connection: close\r\n\r\n" +
      msg,
  );
  socket.destroy();
}

// Extend WebSocket type to support isAlive and subscriptions
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  subscriptions: Set<number>;
}

/** Return type of {@link attachWebSocketServer}: object with broadcast helpers. */
export type WebSocketServerHandle = {
  broadcastMatchCreated: (match: Match) => void;
  broadcastCommentary: (matchId: number, commentary: string) => void;
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
    noServer: true,
    maxPayload: 1024 * 1024,
  });

  server.on("upgrade", async (req, socket, head) => {
    const path = req.url?.split("?")[0];
    if (path !== WS_PATH) {
      rejectUpgrade(socket, 404, "Not Found");
      return;
    }

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(
          incomingMessageToFetchRequest(req),
        );
        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            rejectUpgrade(
              socket,
              429,
              "Too Many Requests",
              "Rate Limit Exceeded",
            );
            return;
          }
          rejectUpgrade(socket, 403, "Forbidden", "Access Denied");
          return;
        }
      } catch (error) {
        console.error("WS upgrade protection error:", error);
        rejectUpgrade(
          socket,
          503,
          "Service Unavailable",
          "Internal Server Error",
        );
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (socket: WebSocket) => {
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
  function broadcastCommentary(matchId: number, commentary: string) {
    broadcastToMatch(matchId, { type: "commentary", data: commentary });
  }

  // Return the broadcasting function for use elsewhere in the app
  return { broadcastMatchCreated, broadcastCommentary };
}
