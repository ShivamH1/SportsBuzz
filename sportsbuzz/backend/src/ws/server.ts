import WebSocket, { WebSocketServer, type Server } from "ws";
import type { Match } from "../db/schema";
import { incomingMessageToFetchRequest, wsArcjet } from "../arcjet";

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
 * Sets up real-time communication with clients, including heartbeat checks to clean up dead connections,
 * a welcome message when a client connects, and a broadcast function for new match events.
 *
 * @param server - The existing HTTP or HTTPS server to attach the WebSocket server to.
 * @returns An object with a function to broadcast new match creation events.
 */
export function attachWebSocketServer(
  server: import("http").Server | import("https").Server
): WebSocketServerHandle {
  // Create the WebSocket server on path "/ws" with a max payload of 1 MB
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  // When a client connects... req is Node's IncomingMessage (upgrade request), not Express
  wss.on("connection", async (socket: WebSocket, req) => {
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(
          incomingMessageToFetchRequest(req)
        );

        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? "Rate Limit Exceeded"
            : "Forbidden";
          socket.close(code, reason);
          return;
        }
      } catch (error) {
        console.error("WS Connection error:", error);
        socket.close(1011, "Internal Server Error");
        return;
      }
    }

    const hbSocket = socket as HeartbeatWebSocket;

    // Mark the socket as alive for heartbeat checking
    hbSocket.isAlive = true;

    // When the client responds to a ping with a pong, mark it alive again
    hbSocket.on("pong", () => {
      hbSocket.isAlive = true;
    });

    // Send a welcome message to the client
    sendJson(hbSocket, {
      type: "welcome",
      message: "Welcome to the WebSocket server",
    });

    // Log any socket errors
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
