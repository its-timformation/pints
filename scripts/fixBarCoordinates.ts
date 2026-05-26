import "dotenv/config";
import { db } from "../server/db";
import { bars } from "../shared/schema";
import { resolveGoogleMapsLink } from "../server/utils/extractMapCoords";
import { eq } from "drizzle-orm";

async function run() {
  const allBars = await db.select().from(bars);
  const barsWithLinks = allBars.filter(b => b.googleMapsUrl);

  console.log(`Found ${barsWithLinks.length} bars with Google Maps links`);

  for (const bar of barsWithLinks) {
    try {
      console.log(`\nResolving: ${bar.name}`);
      console.log(`  Link: ${bar.googleMapsUrl}`);

      const result = await resolveGoogleMapsLink(bar.googleMapsUrl!);

      await db.update(bars).set({
        lat: result.lat,
        lng: result.lng,
        ...(result.websiteUrl && !bar.websiteUrl ? { websiteUrl: result.websiteUrl } : {}),
      }).where(eq(bars.id, bar.id));

      console.log(`  ✓ Updated: ${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}${result.websiteUrl ? " + website" : ""}`);

      await new Promise(r => setTimeout(r, 1500));
    } catch (e: any) {
      console.log(`  ✗ Failed: ${e.message}`);
    }
  }

  console.log("\nDone.");
}

run().catch(console.error);
