import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

//Connection event
wss.on("connection", (socket, req) => {
  const ip = req.socket.remoteAddress;

  socket.on("message", (rawData) => {
    const message = rawData.toString();
    console.log(`Received message from ${ip}: ${message}`);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN)
        client.send(`Server Broadcast: ${message}`);
    });
  });

  socket.on("error", (err) => {
    console.error(`Error on connection with ${ip}:`, err.message);
  });

  socket.on("close", () => {
    console.log(`Connection closed with ${ip}`);
  });
});

console.log("WebSocket server is running on ws://localhost:8080");