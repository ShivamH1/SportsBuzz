import express from "express";
import { matchesRouter } from "./routes/matches";
import "dotenv/config";
import http from "http";
import { attachWebSocketServer } from "./ws/server";

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
app.use("/matches", matchesRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);
// This statement makes the broadcastMatchCreated function available on app.locals so that it can be accessed from other parts of the app 
// (e.g., in route handlers or middleware) via req.app.locals.broadcastMatchCreated.
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, Number(HOST), () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on ${baseUrl}`);
  console.log(
    `WebSocket server is running on ${baseUrl.replace("http://", "ws://")}/ws`
  );
});
