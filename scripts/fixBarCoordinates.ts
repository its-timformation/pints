import "dotenv/config";
import { db } from "../server/db";
import { bars } from "../shared/schema";
import { eq, isNotNull } from "drizzle-orm";
import { scrapeMapLink } from "../server/utils/extractMapCoords";

async function main() {
  const allBars = await db.select().from(bars).where(isNotNull(bars.googleMapsUrl));
  console.log(`Found ${allBars.length} bars with a Google Maps URL`);

  for (const bar of allBars) {
    if (!bar.googleMapsUrl) continue;
    try {
      const result = await scrapeMapLink(bar.googleMapsUrl);
      await db.update(bars)
        .set({ lat: result.lat, lng: result.lng })
        .where(eq(bars.id, bar.id));
      console.log(`Updated ${bar.name}: ${result.lat}, ${result.lng}`);
    } catch (e: any) {
      console.error(`Failed ${bar.name}: ${e.message}`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

main();
