import { Router, type Request, type Response } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validations/matches";
import { db } from "../db/db";
import { matches, type MatchStatus } from "../db/schema";
import { getMatchStatus } from "../utils/matchStatus";
import { desc } from "drizzle-orm";

export const matchesRouter = Router();

const MAX_LIMIT = 100;

matchesRouter.get("/", async (req: Request, res: Response) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid Query",
      details: parsed.error.issues,
    });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);
  const result = await db
    .select()
    .from(matches)
    .orderBy(desc(matches.createdAt))
    .limit(limit);

  return res.status(200).json({ data: result });
});

matchesRouter.post("/", async (req: Request, res: Response) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid Payload",
      details: parsed.error.issues,
    });
  }

  const {
    startTime,
    endTime,
    homeScore,
    awayScore,
    homeWickets,
    awayWickets,
    ...rest
  } = parsed.data;

  const isCricket = rest.sport?.toLowerCase() === "cricket";

  try {
    const result = await db
      .insert(matches)
      .values({
        ...rest,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        homeWickets: homeWickets ?? 0,
        awayWickets: awayWickets ?? 0,
        status: getMatchStatus(startTime, endTime) as MatchStatus,
      })
      .returning();
    const [event] = result;

    if (res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(event);
    }

    return res.status(201).json({ data: event });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
