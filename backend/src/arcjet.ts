import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/bun";
import type { IncomingMessage } from "http";
import type {
  Request as ExpressRequest,
  Response,
  NextFunction,
} from "express";

/**
 request.headers.get is not a function in Arcjet’s toArcjetRequest.
 Cause: @arcjet/bun is built for the Fetch API. Its protect() expects a Request that has headers.get(). 
 Express’s req has req.headers as a plain object (e.g. req.headers.cookie), so there is no headers.get() and the 
 call failed.
**/
/**
 * Build a Fetch API Request from an Express request so @arcjet/bun's protect() receives
 * an object with headers.get() (it does not accept Express's req.headers object).
 */
function headersObjectToFetchHeaders(
  headers: Record<string, string | string[] | undefined>,
): Headers {
  const h = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined)
      h.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  return h;
}

export function expressReqToFetchRequest(req: ExpressRequest): Request {
  const host = req.get("host") ?? "";
  const url = `${req.protocol}://${host}${req.originalUrl}`;
  return new Request(url, {
    method: req.method,
    headers: headersObjectToFetchHeaders(
      req.headers as Record<string, string | string[] | undefined>,
    ),
  });
}

/**
The connection callback from ws receives (socket, req) where req is Node’s IncomingMessage (the HTTP upgrade request), 
not Express’s Request.
IncomingMessage has req.headers (plain object) and no req.get() or req.protocol, so calling expressReqToFetchRequest(req)
led to req.get is not a function.
**/
/**
 * Build a Fetch API Request from a Node IncomingMessage (e.g. WebSocket upgrade request).
 * IncomingMessage has req.headers but no req.get() or req.protocol.
 */
export function incomingMessageToFetchRequest(req: IncomingMessage): Request {
  const host =
    (req.headers && (req.headers.host as string | undefined)) ?? "localhost";
  const url = `http://${host}${req.url ?? "/"}`;
  return new Request(url, {
    method: req.method ?? "GET",
    headers: headersObjectToFetchHeaders(
      (req.headers as Record<string, string | string[] | undefined>) ?? {},
    ),
  });
}

const arcjetKey = process.env.ARCJET_API_KEY;
const arcjetMode = process.env.ARCJET_ENV === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) {
  throw new Error("ARCJET_API_KEY environment variable is not set");
}

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        // detectBot({
        //   mode: arcjetMode,
        //   allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        // }),
        slidingWindow({ mode: arcjetMode, interval: "10s", max: 50 }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        // detectBot({
        //   mode: arcjetMode,
        //   allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        // }),
        slidingWindow({ mode: arcjetMode, interval: "2s", max: 5 }),
      ],
    })
  : null;

/** Express middleware: runs Arcjet protection and denies/responds on failure. */
export function securityMiddleware(): (
  req: ExpressRequest,
  res: Response,
  next: NextFunction,
) => Promise<void> {
  return async (req: ExpressRequest, res: Response, next: NextFunction) => {
    if (!httpArcjet) {
      next();
      return;
    }

    try {
      const decision = await httpArcjet.protect(expressReqToFetchRequest(req));
      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          res.status(429).json({ error: "Too Many Requests" });
          return;
        }
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    } catch (error) {
      console.error("Arcjet Middleware Error:", error);
      res.status(503).json({ error: "Service Unavailable" });
      return;
    }

    next();
  };
}
