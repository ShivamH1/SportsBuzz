import {
    pgTable,
    pgEnum,
    serial,
    text,
    integer,
    timestamp,
    jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for match status
export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);

// Matches table
export const matches = pgTable('matches', {
    id: serial('id').primaryKey(),
    sport: text('sport').notNull(),
    homeTeam: text('home_team').notNull(),
    awayTeam: text('away_team').notNull(),
    status: matchStatusEnum('status').notNull().default('scheduled'),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }),
    homeScore: integer('home_score').notNull().default(0),
    awayScore: integer('away_score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Commentary table
export const commentary = pgTable('commentary', {
    id: serial('id').primaryKey(),
    matchId: integer('match_id')
        .notNull()
        .references(() => matches.id, { onDelete: 'cascade' }),
    // 'cascade' and 'restrict' refer to actions taken by the database when the referenced primary key (matches.id) is deleted or updated.
    // In the line:
    //   .references(() => matches.id, { onDelete: 'cascade' }),
    // 'onDelete: "cascade"' means that if a match is deleted, all related commentary rows will also be deleted automatically ('cascade').
    // 'restrict' (as in 'onDelete: "restrict"') would prevent deletion of a match if related commentary exists.
    // You can use: .references(() => matches.id, { onDelete: 'restrict' }) if you want to block deleting matches that have commentary.
    minute: integer('minute').notNull(),
    sequence: integer('sequence').notNull(),
    period: text('period').notNull(),
    eventType: text('event_type').notNull(),
    actor: text('actor'),
    team: text('team'),
    message: text('message').notNull(),
    metadata: jsonb('metadata'),
    tags: text('tags').array().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations for type-safe queries
export const matchesRelations = relations(matches, ({ many }) => ({
    commentary: many(commentary),
}));

export const commentaryRelations = relations(commentary, ({ one }) => ({
    match: one(matches, {
        fields: [commentary.matchId],
        references: [matches.id],
    }),
}));

// Export types for type-safe queries
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Commentary = typeof commentary.$inferSelect;
export type NewCommentary = typeof commentary.$inferInsert;
export type MatchStatus = typeof matchStatusEnum.enumValues[number];
