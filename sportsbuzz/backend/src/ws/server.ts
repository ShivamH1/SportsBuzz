import WebSocket, { WebSocketServer, type Server } from "ws";
import type { Match } from "../db/schema";

function sendJson(socket: WebSocket, payload: any) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcast(wss: Server, payload: any) {
  wss.clients.forEach((socket: WebSocket) => {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(payload));
  });
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
    sendJson(socket, {
      type: "welcome",
      message: "Welcome to the WebSocket server",
    });
    socket.on("error", console.error);
  });

  function broadcastMatchCreated(match: Match) {
    broadcast(wss, { type: "match_created", data: match });
  }

  return { broadcastMatchCreated };
}
