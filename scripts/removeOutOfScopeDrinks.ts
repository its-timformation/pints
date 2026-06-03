import 'dotenv/config';
import { db } from '../server/db';
import { drinks } from '../shared/schema';
import { eq } from 'drizzle-orm';

const REMOVE_PATTERNS = [
  // Hot non-alcoholic drinks
  /^espresso$/i, /^ristretto$/i, /^décaféiné$/i, /^allongé$/i,
  /cappuccino/i, /café latte/i, /café viennois/i, /chocolat viennois/i,
  /^thé$/i, /^tea$/i, /tisane/i,
  /chocolat chaud/i, /hot chocolate/i,
  /grand café/i, /grande crème/i, /^café$/i,
  // Soft drinks
  /^coca/i, /^cola/i, /^sprite/i, /^fanta/i, /^orangina/i,
  /^limonade/i, /^eau plate/i, /^eau gazeuse/i, /^water$/i,
  /jus d'orange/i, /jus de pomme/i, /jus d'ananas/i,
  /ice tea/i, /^perrier$/i, /^badoit$/i, /^evian$/i,
  // Mocktails / virgin drinks (non-alcoholic only)
  /^virgin mojito$/i, /^virgin mule$/i, /^florida$/i, /^le virgin/i,
  // Generic soda
  /^soda$/i, /^soda soft$/i,
];

async function run() {
  const all = await db.select().from(drinks);
  let removed = 0;
  for (const drink of all) {
    const shouldRemove = REMOVE_PATTERNS.some(p => p.test(drink.name.trim()));
    if (shouldRemove) {
      await db.delete(drinks).where(eq(drinks.id, drink.id));
      console.log(`  ✗ Removed: "${drink.name}"`);
      removed++;
    }
  }
  console.log(`\nDone. Removed ${removed} of ${all.length} drinks.`);
}

run().catch(console.error);
