import WebSocket, { WebSocketServer, type Server } from "ws";
import type { Match } from "../db/schema";
import { incomingMessageToFetchRequest, wsArcjet } from "../arcjet";

const WS_PATH = "/ws";

function sendJson(socket: WebSocket, payload: any) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcast(wss: Server, payload: any) {
  wss.clients.forEach((socket: WebSocket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  });
}

/** Write a minimal HTTP error response on the raw socket and destroy it. */
function rejectUpgrade(
  socket: import("net").Socket,
  statusCode: number,
  statusMessage: string,
  body?: string
) {
  const msg = body ?? statusMessage;
  socket.write(
    `HTTP/1.1 ${statusCode} ${statusMessage}\r\n` +
      "Content-Type: text/plain\r\n" +
      `Content-Length: ${Buffer.byteLength(msg, "utf8")}\r\n` +
      "Connection: close\r\n\r\n" +
      msg
  );
  socket.destroy();
}

// Extend WebSocket type to support isAlive
interface HeartbeatWebSocket extends WebSocket {
  isAlive?: boolean;
}

/** Return type of {@link attachWebSocketServer}: object with broadcast helpers. */
export type WebSocketServerHandle = {
  broadcastMatchCreated: (match: Match) => void;
};

/**
 * Attaches a WebSocket server to an existing HTTP or HTTPS server.
 * Protection runs in the server 'upgrade' handler (before handshake); on success
 * handleUpgrade is called and connection is emitted without any protection call.
 */
export function attachWebSocketServer(
  server: import("http").Server | import("https").Server
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
          incomingMessageToFetchRequest(req)
        );
        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            rejectUpgrade(socket, 429, "Too Many Requests", "Rate Limit Exceeded");
            return;
          }
          rejectUpgrade(socket, 403, "Forbidden", "Access Denied");
          return;
        }
      } catch (error) {
        console.error("WS upgrade protection error:", error);
        rejectUpgrade(socket, 503, "Service Unavailable", "Internal Server Error");
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (socket: WebSocket) => {
    const hbSocket = socket as HeartbeatWebSocket;

    hbSocket.isAlive = true;
    hbSocket.on("pong", () => {
      hbSocket.isAlive = true;
    });

    sendJson(hbSocket, {
      type: "welcome",
      message: "Welcome to the WebSocket server",
    });

    hbSocket.on("error", console.error);
  });

  // Set up an interval to regularly check if clients are alive (heartbeat mechanism)
  // Every 30 seconds, for each client: if it hasn't responded to last ping, terminate it;
  // otherwise, send a ping and mark it as not alive, waiting for pong.
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const hbWs = ws as HeartbeatWebSocket;
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
    broadcast(wss, { type: "match_created", data: match });
  }

  // Return the broadcasting function for use elsewhere in the app
  return { broadcastMatchCreated };
}
