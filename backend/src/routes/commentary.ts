import { Router, type Request, type Response } from "express";
import { db } from "../db/db";
import { commentary, matches } from "../db/schema";
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

    // Handle score and wicket updates
    const matchId = paramsResult.data.id;
    const team = bodyResult.data.team;
    const { scoreDelta } = bodyResult.data;

    // Fetch current match to decide how to update
    const [matchRecord] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (matchRecord) {
      let updates: Partial<typeof matches.$inferSelect> = {};

      const isHome =
        team === matchRecord.homeTeam || team?.toUpperCase() === "HOME";
      const isAway =
        team === matchRecord.awayTeam || team?.toUpperCase() === "AWAY";

      // 1. Use explicit scoreDelta if provided
      if (scoreDelta) {
        if (scoreDelta.home)
          updates.homeScore = (matchRecord.homeScore || 0) + scoreDelta.home;
        if (scoreDelta.away)
          updates.awayScore = (matchRecord.awayScore || 0) + scoreDelta.away;
        if (scoreDelta.homeWickets)
          updates.homeWickets =
            (matchRecord.homeWickets || 0) + scoreDelta.homeWickets;
        if (scoreDelta.awayWickets)
          updates.awayWickets =
            (matchRecord.awayWickets || 0) + scoreDelta.awayWickets;
      }
      // 2. Otherwise fall back to eventType logic
      else if (eventType) {
        const type = eventType.toUpperCase();

        // Scoring regular points/goals/runs
        let points = 0;
        if (type === "GOAL" || type === "RUN") points = 1;
        else if (type === "BASKET") points = 2;
        else if (type === "THREE") points = 3;
        else if (type === "FOUR") points = 4;
        else if (type === "SIX") points = 6;

        if (points > 0) {
          if (isHome) updates.homeScore = (matchRecord.homeScore || 0) + points;
          else if (isAway)
            updates.awayScore = (matchRecord.awayScore || 0) + points;
        }

        // Handling Wickets
        if (type === "WICKET") {
          if (isHome) updates.homeWickets = (matchRecord.homeWickets || 0) + 1;
          else if (isAway)
            updates.awayWickets = (matchRecord.awayWickets || 0) + 1;
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.update(matches).set(updates).where(eq(matches.id, matchId));

        if (res.app.locals.broadcastMatchUpdated) {
          res.app.locals.broadcastMatchUpdated(matchId, updates);
        }
      }
    }

    return res.status(201).json({ data: result });
  } catch (error) {
    console.error("Failed to create commentary:", error);
    return res.status(500).json({ error: "Failed to create commentary." });
  }
});
