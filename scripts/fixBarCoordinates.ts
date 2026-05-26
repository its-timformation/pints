import "dotenv/config";
import { db } from "../server/db";
import { bars } from "../shared/schema";
import { eq } from "drizzle-orm";

// Redirect to updateCoords.ts — coordinate updates are now done via direct
// DB update with hardcoded values. See scripts/updateCoords.ts for the full
// coordinate table and `yarn update:coords` to apply it.
async function run() {
  const allBars = await db.select({ id: bars.id, name: bars.name, googleMapsUrl: bars.googleMapsUrl }).from(bars);
  const withLinks = allBars.filter(b => b.googleMapsUrl);
  console.log(`${withLinks.length} bars have a googleMapsUrl stored.`);
  console.log("Coordinate resolution from URLs is no longer supported server-side.");
  console.log("Use `yarn update:coords` to apply hardcoded coordinates from scripts/updateCoords.ts");
}

run().catch(console.error);
