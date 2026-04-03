import { type ScheduledTask, schedule } from "node-cron";
import { db } from "../db/db";
import { matches, commentary, type NewCommentary, type NewMatch } from "../db/schema";
import { eq, sql, and, ne, or, lt, gte } from "drizzle-orm";
import { getMatchStatus } from "../utils/matchStatus";

const TEAM_POOL = {
  football: ["Arsenal FC", "Liverpool FC", "Real Madrid", "Barcelona", "AC Milan", "Inter Milan", "Manchester City", "Chelsea", "Bayern Munich", "PSG"],
  cricket: ["India", "Australia", "England", "Pakistan", "South Africa", "New Zealand", "Sri Lanka", "Bangladesh", "West Indies", "Afghanistan"],
  basketball: ["LA Lakers", "Boston Celtics", "Chicago Bulls", "Miami Heat", "Golden State Warriors", "Phoenix Suns", "Milwaukee Bucks", "Philadelphia 76ers"],
};

const SPORT_EVENTS = {
  football: [
    { type: "pass", message: "A tactical build-up in the middle of the pitch." },
    { type: "shot", message: "A powerful strike from outside the box!" },
    { type: "goal", message: "GOAL!!! A clinical finish into the bottom corner." },
    { type: "foul", message: "A rough challenge leads to a free kick." },
    { type: "yellow_card", message: "The referee shoes a yellow card for that tackle." },
    { type: "corner", message: "An outswinging corner into a crowded box." },
    { type: "save", message: "What a save! The keeper tips it over the bar." },
  ],
  cricket: [
    { type: "run", message: "A quick single taken by the batsman." },
    { type: "four", message: "FOUR! That's timed to perfection through the covers." },
    { type: "six", message: "SIX!!! Cleared the boundary with ease." },
    { type: "wicket", message: "OUT! The stumps are rattled. A huge breakthrough!" },
    { type: "dot_ball", message: "A solid defensive stroke. No run." },
    { type: "wide", message: "Wide ball. The bowler needs to find his line." },
  ],
  basketball: [
    { type: "basket", message: "A smooth jump shot from the elbow." },
    { type: "three", message: "THREE! Nothing but net from downtown." },
    { type: "dunk", message: "Slam dunk! The crowd goes wild." },
    { type: "foul", message: "Foul called reaching in. Two free throws." },
    { type: "rebound", message: "A strong offensive rebound under the rim." },
    { type: "assist", message: "A beautiful no-look pass for the lay-up." },
  ],
};

const DEFAULT_EVENTS = [
  { type: "commentary", message: "The intensity is picking up as we approach the break." },
  { type: "commentary", message: "Both teams are looking for an opening." },
];

export class LiveFeedService {
  private static eventTask: ScheduledTask | null = null;
  private static spawnerTask: ScheduledTask | null = null;
  private static broadcastCommentary: any = null;
  private static broadcastMatchUpdated: any = null;
  private static broadcastMatchCreated: any = null;

  static init(broadcastCommentary: any, broadcastMatchUpdated: any, broadcastMatchCreated: any) {
    this.broadcastCommentary = broadcastCommentary;
    this.broadcastMatchUpdated = broadcastMatchUpdated;
    this.broadcastMatchCreated = broadcastMatchCreated;

    // Run every 30 seconds for commentary events
    this.eventTask = schedule("*/30 * * * * *", async () => {
      await this.syncAllMatches();
      await this.generateLiveEvents();
    });

    // Run every 1 minute to check if we need new matches
    this.spawnerTask = schedule("*/1 * * * *", async () => {
      await this.spawnRandomMatch();
    });

    console.log("🚀 Live Feed Service initialized (30s events, 5min spawner)");
  }

  private static async spawnRandomMatch() {
    try {
      const liveMatches = await db.select().from(matches).where(eq(matches.status, "live"));

      // Keep at least 3 matches live at all times
      if (liveMatches.length >= 3) return;

      const sports = Object.keys(TEAM_POOL) as (keyof typeof TEAM_POOL)[];
      const randomSport = sports[Math.floor(Math.random() * sports.length)];
      if (!randomSport) return;

      const teams = TEAM_POOL[randomSport];

      let homeTeam = teams[Math.floor(Math.random() * teams.length)];
      let awayTeam = teams[Math.floor(Math.random() * teams.length)];

      if (!homeTeam || !awayTeam) return;

      while (homeTeam === awayTeam) {
        awayTeam = teams[Math.floor(Math.random() * teams.length)];
      }

      const now = new Date();
      const startTime = new Date(now.getTime() - 1000); // Start just now
      const durationHours = randomSport === "cricket" ? 8 : 2; // Cricket lasts longer
      const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

      const newMatch: NewMatch = {
        sport: randomSport,
        homeTeam: homeTeam as string,
        awayTeam: awayTeam as string,
        status: "live",
        startTime,
        endTime,
      };

      const [savedMatch] = await db.insert(matches).values(newMatch).returning();

      if (!savedMatch) return;

      if (this.broadcastMatchCreated) {
        this.broadcastMatchCreated(savedMatch);
      }

      console.log(`🆕 Automatically spawned new ${randomSport} match: ${homeTeam} vs ${awayTeam}`);

      // Add a kickoff commentary
      const kickoffEntry: NewCommentary = {
        matchId: savedMatch.id,
        minute: 0,
        sequence: 1,
        period: "1st half",
        eventType: "kickoff",
        team: homeTeam,
        message: `Welcome to this live ${randomSport} match between ${homeTeam} and ${awayTeam}!`,
      };

      const [savedCommentary] = await db.insert(commentary).values(kickoffEntry).returning();
      if (this.broadcastCommentary && savedCommentary) {
        this.broadcastCommentary(savedMatch.id, savedCommentary);
      }
    } catch (error) {
      console.error("Error spawning random match:", error);
    }
  }

  private static async syncAllMatches() {
    try {
      const allMatches = await db.select().from(matches).where(ne(matches.status, "finished"));

      for (const match of allMatches) {
        const nextStatus = getMatchStatus(match.startTime, match.endTime);

        if (nextStatus && nextStatus !== match.status) {
          await db.update(matches).set({ status: nextStatus }).where(eq(matches.id, match.id));
          if (this.broadcastMatchUpdated) {
            this.broadcastMatchUpdated(match.id, { status: nextStatus });
          }
          console.log(`🔄 Match ${match.id} status synced to: ${nextStatus}`);
        }
      }
    } catch (error) {
      console.error("Error syncing match statuses:", error);
    }
  }

  private static async generateLiveEvents() {
    try {
      const liveMatches = await db
        .select()
        .from(matches)
        .where(eq(matches.status, "live"));

      if (liveMatches.length === 0) return;

      for (const match of liveMatches) {
        // 35% chance to generate an event for this match in this tick
        if (Math.random() > 0.35) continue;

        const events = SPORT_EVENTS[match.sport as keyof typeof SPORT_EVENTS] || DEFAULT_EVENTS;
        const randomEvent = events[Math.floor(Math.random() * events.length)];

        if (!randomEvent) continue;

        // Get latest sequence for this match
        const lastCommentary = await db
          .select({ sequence: commentary.sequence, minute: commentary.minute })
          .from(commentary)
          .where(eq(commentary.matchId, match.id))
          .orderBy(sql`${commentary.sequence} DESC`)
          .limit(1);

        const nextSequence = (lastCommentary[0]?.sequence ?? 0) + 1;
        const currentMinute = (lastCommentary[0]?.minute ?? 0) + Math.floor(Math.random() * 2);

        const team = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
        const isHome = team === match.homeTeam;

        const newEntry: NewCommentary = {
          matchId: match.id,
          minute: currentMinute,
          sequence: nextSequence,
          period: "Live",
          eventType: randomEvent.type,
          team: team,
          message: `${randomEvent.message} (${team})`,
        };

        const [savedEntry] = await db.insert(commentary).values(newEntry).returning();

        // Handle score updates
        let scoreUpdate: any = {};
        if (randomEvent.type === "goal" || randomEvent.type === "run") {
          if (isHome) scoreUpdate.homeScore = match.homeScore + 1;
          else scoreUpdate.awayScore = match.awayScore + 1;
        } else if (randomEvent.type === "basket") {
          if (isHome) scoreUpdate.homeScore = match.homeScore + 2;
          else scoreUpdate.awayScore = match.awayScore + 2;
        } else if (randomEvent.type === "three") {
          if (isHome) scoreUpdate.homeScore = match.homeScore + 3;
          else scoreUpdate.awayScore = match.awayScore + 3;
        } else if (randomEvent.type === "four") {
          if (isHome) scoreUpdate.homeScore = match.homeScore + 4;
          else scoreUpdate.awayScore = match.awayScore + 4;
        } else if (randomEvent.type === "six") {
          if (isHome) scoreUpdate.homeScore = match.homeScore + 6;
          else scoreUpdate.awayScore = match.awayScore + 6;
        } else if (randomEvent.type === "wicket") {
          if (isHome) scoreUpdate.homeWickets = match.homeWickets + 1;
          else scoreUpdate.awayWickets = match.awayWickets + 1;
        }

        if (Object.keys(scoreUpdate).length > 0) {
          await db.update(matches).set(scoreUpdate).where(eq(matches.id, match.id));
          if (this.broadcastMatchUpdated) {
            this.broadcastMatchUpdated(match.id, scoreUpdate);
          }
        }

        if (this.broadcastCommentary) {
          this.broadcastCommentary(match.id, savedEntry);
        }

        console.log(`📣 Match ${match.id} - ${randomEvent.type}: ${newEntry.message}`);
      }
    } catch (error) {
      console.error("Error generating live events:", error);
    }
  }

  static stop() {
    if (this.eventTask) {
      this.eventTask.stop();
      this.eventTask = null;
    }
    if (this.spawnerTask) {
      this.spawnerTask.stop();
      this.spawnerTask = null;
    }
  }
}
