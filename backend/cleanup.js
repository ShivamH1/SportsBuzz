import { db } from "./src/db/db";
import { matches } from "./src/db/schema";
import { isNull, or } from "drizzle-orm";

async function cleanup() {
    console.log("🧹 Cleaning up NULL scores in database...");
    const result = await db.update(matches)
        .set({
            homeScore: 0,
            awayScore: 0,
            homeWickets: 0,
            awayWickets: 0
        })
        .where(
            or(
                isNull(matches.homeScore),
                isNull(matches.awayScore),
                isNull(matches.homeWickets),
                isNull(matches.awayWickets)
            )
        );

    console.log("✅ Cleanup complete.");
    process.exit(0);
}

cleanup().catch(err => {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
});
