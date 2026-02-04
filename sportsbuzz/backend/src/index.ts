import express from "express";
import { matchesRouter } from "./routes/matches";
import "dotenv/config";
import http from "http";
import { attachWebSocketServer } from "./ws/server";
import { securityMiddleware } from "./arcjet";
import { commentaryRouter } from "./routes/commentary";
import cors from "cors";

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "0.0.0.0";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(
  cors({ origin: [FRONTEND_URL, "http://localhost:5173"], credentials: true }),
);
app.use(securityMiddleware());

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
app.use("/matches", matchesRouter);
app.use("/matches/:id/commentary", commentaryRouter);

const { broadcastMatchCreated, broadcastCommentary } =
  attachWebSocketServer(server);

// This statement makes the broadcastMatchCreated and broadcastCommentary functions available on app.locals so that it can be accessed from other parts of the app
// (e.g., in route handlers or middleware) via req.app.locals.broadcastMatchCreated.
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

server.listen(PORT, Number(HOST), () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on ${baseUrl}`);
  console.log(
    `WebSocket server is running on ${baseUrl.replace("http://", "ws://")}/ws`,
  );
});
