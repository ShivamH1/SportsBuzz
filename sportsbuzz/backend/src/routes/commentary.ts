import { Router, type Request, type Response } from "express";
import { db } from "../db/db";
import { commentary } from "../db/schema";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
  matchIdParamSchema,
} from "../validations/commentary";
import { eq, desc } from "drizzle-orm";

const MAX_LIMIT = 100;

export const commentaryRouter = Router({ mergeParams: true });

/**
 * GET /
 * (Mounted at /matches/:id/commentary)
 * Fetches commentary for a specific match.
 */
commentaryRouter.get("/", async (req: Request, res: Response) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid match ID.",
      details: paramsResult.error.issues,
    });
  }

  const queryResult = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({
      error: "Invalid query parameters.",
      details: queryResult.error.issues,
    });
  }

  try {
    const { id: matchId } = paramsResult.data;
    const { limit = MAX_LIMIT } = queryResult.data;

    const safeLimit = Math.min(limit, MAX_LIMIT);

    const results = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(safeLimit);

    return res.status(200).json({ data: results });
  } catch (error) {
    console.error("Failed to fetch commentary:", error);
    return res.status(500).json({ error: "Failed to fetch commentary." });
  }
});

/**
 * POST /
 * (Mounted at /matches/:id/commentary)
 * Adds a new commentary entry for a specific match.
 * Validates match ID from params and commentary data from body.
 */
commentaryRouter.post("/", async (req: Request, res: Response) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid match ID.",
      details: paramsResult.error.issues,
    });
  }

  const bodyResult = createCommentarySchema.safeParse(req.body);

  if (!bodyResult.success) {
    return res.status(400).json({
      error: "Invalid commentary payload.",
      details: bodyResult.error.issues,
    });
  }

  try {
    const { minute, sequence, period, eventType, ...rest } = bodyResult.data;

    // Insert into DB. Providing defaults for required DB fields that are optional in Zod.
    const [result] = await db
      .insert(commentary)
      .values({
        matchId: paramsResult.data.id,
        minute,
        sequence: sequence ?? 0,
        period: period ?? "N/A",
        eventType: eventType ?? "commentary",
        ...rest,
      })
      .returning();

    if (res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(result?.matchId, result);
    }

    return res.status(201).json({ data: result });
  } catch (error) {
    console.error("Failed to create commentary:", error);
    return res.status(500).json({ error: "Failed to create commentary." });
  }
});
