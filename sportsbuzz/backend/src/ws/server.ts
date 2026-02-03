import WebSocket, { WebSocketServer, type Server } from "ws";
import type { Match } from "../db/schema";

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

export function attachWebSocketServer(
  server: import("http").Server | import("https").Server
) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
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

  wss.on("close", () => {
    clearInterval(interval);
  });

  function broadcastMatchCreated(match: Match) {
    broadcast(wss, { type: "match_created", data: match });
  }

  return { broadcastMatchCreated };
}
