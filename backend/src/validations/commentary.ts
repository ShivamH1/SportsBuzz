import { z } from "zod";

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/** Validates req.params for routes under /matches/:id/commentary (param name: id). */
export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createCommentarySchema = z.object({
  minute: z.number().int().nonnegative(),
  sequence: z.number().int().optional(),
  period: z.string().optional(),
  eventType: z.string().optional(),
  actor: z.string().optional(),
  team: z.string().optional(),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  scoreDelta: z
    .object({
      home: z.number().int().optional(),
      away: z.number().int().optional(),
      homeWickets: z.number().int().optional(),
      awayWickets: z.number().int().optional(),
    })
    .optional(),
});
