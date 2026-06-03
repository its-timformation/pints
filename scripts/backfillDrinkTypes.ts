import 'dotenv/config';
import { db } from '../server/db';
import { drinks } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { detectDrinkType } from '../client/src/lib/detectDrinkType';

async function run() {
  const all = await db.select().from(drinks);
  let updated = 0;
  for (const drink of all) {
    if (!drink.drinkType) {
      const type = detectDrinkType(drink.name);
      await db.update(drinks).set({ drinkType: type }).where(eq(drinks.id, drink.id));
      updated++;
    }
  }
  console.log(`Backfilled ${updated} drinks with type.`);
}

run().catch(console.error);
