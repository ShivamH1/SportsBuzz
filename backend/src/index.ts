import express from "express";
import { matchesRouter } from "./routes/matches";
import "dotenv/config";
import http from "http";
import { attachWebSocketServer } from "./ws/server";
import { securityMiddleware } from "./arcjet";
import { commentaryRouter } from "./routes/commentary";
import cors from "cors";

import { LiveFeedService } from "./services/liveFeedService";

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

const { broadcastMatchCreated, broadcastMatchUpdated, broadcastCommentary } =
  attachWebSocketServer(server);

// This statement makes the broadcastMatchCreated, broadcastMatchUpdated and broadcastCommentary functions available on app.locals so that it can be accessed from other parts of the app
// (e.g., in route handlers or middleware) via req.app.locals.broadcastMatchCreated.
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastMatchUpdated = broadcastMatchUpdated;
app.locals.broadcastCommentary = broadcastCommentary;

// Initialize Live Feed Generator
LiveFeedService.init(
  broadcastCommentary,
  broadcastMatchUpdated,
  broadcastMatchCreated,
);

server.listen(PORT, Number(HOST), () => {
  console.log("Server is Up!");
});
