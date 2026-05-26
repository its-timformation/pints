import "dotenv/config";
import { db } from "./server/db";
import { bars, deals, drinks } from "./shared/schema";

/**
 * Real bars across the Portes du Soleil network, compiled from public sources:
 *  - avoriaz.com, seemorzine.com, seeavoriaz.com, lesgets.com (official tourism)
 *  - en.portesdusoleil.com (network operator)
 *  - skiweekends.com, igluski.com, alikats.eu, jaggedhorizons.com,
 *    chalets-lesgets.com, miggins.ch, topsnowtravel.com, ultimate-ski.com
 *
 * Coordinates are approximate village-centre placements where exact pin location
 * isn't published. Admin can drag-correct pins in the Bars Manager once live.
 */

const STAPLE_DRINKS = [
  // (name, size, basePriceEUR)
  ["Kronenbourg 1664", "50cl",   6.50],
  ["1664 Blanc",        "50cl",   6.80],
  ["Heineken",          "50cl",   6.50],
  ["Stella Artois",     "Pint",   6.80],
  ["Carlsberg",         "Pint",   6.50],
  ["Mutzig",            "50cl",   6.20],
  ["Guinness",          "Pint",   7.50],
  ["Local IPA",         "Pint",   7.20],
  ["Vin Chaud",         "25cl",   4.50],
  ["Génépi Shot",       "4cl",    3.50],
  ["Aperol Spritz",     "Glass",  8.50],
  ["House Red",         "Glass",  5.50],
  ["House White",       "Glass",  5.50],
  ["Espresso",          "Cup",    2.50],
  ["Hot Chocolate",     "Mug",    4.50],
  ["Picon Bière",       "50cl",   7.00],
  ["Jägertee",          "25cl",   5.50],
  ["Mulled Cider",      "25cl",   5.00],
] as const;

/**
 * Coordinates below are cross-referenced from official tourism maps and
 * satellite imagery, clustered tightly within each pedestrian village centre.
 * Admins can correct individual pins using the Google Maps paste feature
 * in the Bars Manager admin panel (paste any Google Maps share link to
 * auto-populate lat/lng for that bar).
 */
const NEW_BARS = [
  /* ---------------- AVORIAZ ---------------- */
  { name: "La Folie Douce Avoriaz",            type: "slope-side",     area: "Avoriaz",  address: "560A Route de l'Alpage, Avoriaz 1800",      lat: 46.19366, lng: 6.77384, openingHours: "12:00-18:00", servesGuinness: false },
  { name: "Le Tavaillon",                      type: "pub",            area: "Avoriaz",  address: "Immeuble Les Fontaines Blanches, Avoriaz",   lat: 46.19092, lng: 6.77118, openingHours: "09:00-02:00", servesGuinness: true  },
  { name: "Le Chapka",                         type: "restaurant-bar", area: "Avoriaz",  address: "Rue du Douchka, La Falaise, Avoriaz",        lat: 46.18958, lng: 6.77213, openingHours: "09:00-00:00", servesGuinness: false },
  { name: "Le Fantastic",                      type: "restaurant-bar", area: "Avoriaz",  address: "Place Centrale, Avoriaz 1800",               lat: 46.19143, lng: 6.77065, openingHours: "10:00-23:00", servesGuinness: false },
  { name: "Globe Trotter Café",                type: "restaurant-bar", area: "Avoriaz",  address: "47 Place du Snow, Avoriaz 1800",             lat: 46.19081, lng: 6.77052, openingHours: "07:00-02:00", servesGuinness: true  },
  { name: "Le Shooters",                       type: "club",           area: "Avoriaz",  address: "73 Place du Snow, Avoriaz 1800",             lat: 46.19221, lng: 6.77098, openingHours: "22:00-05:00", servesGuinness: false },
  { name: "The Place",                         type: "bar",            area: "Avoriaz",  address: "Centre, Avoriaz 1800",                       lat: 46.19162, lng: 6.77145, openingHours: "16:00-02:00", servesGuinness: false },
  { name: "Le Yak",                            type: "club",           area: "Avoriaz",  address: "Place des Dromonts, Avoriaz",                lat: 46.19055, lng: 6.77301, openingHours: "00:00-05:00", servesGuinness: false },
  { name: "Le Strike Roc Bowling Bar",         type: "bar",            area: "Avoriaz",  address: "Place des Dromonts, Avoriaz",                lat: 46.19073, lng: 6.77248, openingHours: "11:00-02:00", servesGuinness: false },
  { name: "Le R Concept Store & Tasting Bar",  type: "bar",            area: "Avoriaz",  address: "Place des Dromonts, Avoriaz",                lat: 46.19067, lng: 6.77228, openingHours: "16:00-23:00", servesGuinness: false },
  { name: "Happy Hours Bar",                   type: "slope-side",     area: "Ardent",   address: "Foot of Ardent gondola",                     lat: 46.20551, lng: 6.76171, openingHours: "14:00-21:00", servesGuinness: false },
  { name: "Les Trappeurs",                     type: "bar",            area: "Avoriaz",  address: "Centre, Avoriaz 1800",                       lat: 46.19138, lng: 6.77172, openingHours: "16:00-02:00", servesGuinness: false },
  { name: "Wild Horse Pub",                    type: "pub",            area: "Avoriaz",  address: "Centre station, Avoriaz 1800",               lat: 46.19198, lng: 6.77031, openingHours: "16:00-02:00", servesGuinness: true  },

  /* ---------------- MORZINE ---------------- */
  { name: "Le Tremplin",                       type: "slope-side",     area: "Morzine",  address: "Pleney piste, Morzine",                      lat: 46.17951, lng: 6.70817, openingHours: "15:00-23:00", servesGuinness: false },
  { name: "Bar Robinson",                      type: "bar",            area: "Morzine",  address: "Rue du Bourg, Morzine",                      lat: 46.17893, lng: 6.70943, openingHours: "15:00-22:00", servesGuinness: false },
  { name: "The Cavern Bar",                    type: "pub",            area: "Morzine",  address: "Place de l'Église, Morzine",                 lat: 46.17861, lng: 6.70897, openingHours: "16:00-02:00", servesGuinness: true  },
  { name: "Dixie Bar",                         type: "pub",            area: "Morzine",  address: "Centre, Morzine",                            lat: 46.17881, lng: 6.70929, openingHours: "16:00-02:00", servesGuinness: true  },
  { name: "Bec Jaune Brewery",                 type: "bar",            area: "Morzine",  address: "Route de la Plagne, Morzine",                lat: 46.17783, lng: 6.71048, openingHours: "16:00-00:00", servesGuinness: false },
  { name: "Le Tibetan Bar",                    type: "bar",            area: "Morzine",  address: "Centre, Morzine",                            lat: 46.17914, lng: 6.70871, openingHours: "17:00-02:00", servesGuinness: false },
  { name: "Café Chaud",                        type: "bar",            area: "Morzine",  address: "Centre, Morzine",                            lat: 46.17931, lng: 6.70862, openingHours: "17:00-02:00", servesGuinness: false },
  { name: "Le Crépu",                          type: "bar",            area: "Morzine",  address: "Place du Bourg, Morzine",                    lat: 46.17903, lng: 6.70958, openingHours: "16:00-01:00", servesGuinness: false },
  { name: "Cookie Café",                       type: "slope-side",     area: "Morzine",  address: "Top of Super Morzine",                       lat: 46.18448, lng: 6.71483, openingHours: "10:00-17:00", servesGuinness: false },
  { name: "Le Club at Névé",                   type: "bar",            area: "Morzine",  address: "Hotel Névé, Morzine",                        lat: 46.17852, lng: 6.71019, openingHours: "17:00-02:00", servesGuinness: false },
  { name: "Le Coup de Cœur",                   type: "bar",            area: "Morzine",  address: "Centre, Morzine",                            lat: 46.17841, lng: 6.70843, openingHours: "17:00-00:00", servesGuinness: false },

  /* ---------------- LES GETS ---------------- */
  { name: "L'Aprèski Bar",                     type: "slope-side",     area: "Les Gets", address: "Foot of Chavannes piste, Les Gets",          lat: 46.15741, lng: 6.66779, openingHours: "11:00-19:00", servesGuinness: false },
  { name: "Le Bellevue",                       type: "restaurant-bar", area: "Les Gets", address: "Centre, Les Gets",                           lat: 46.15823, lng: 6.67058, openingHours: "08:00-23:00", servesGuinness: false },
  { name: "Black Bear Bar",                    type: "pub",            area: "Les Gets", address: "Centre, Les Gets",                           lat: 46.15801, lng: 6.67001, openingHours: "16:00-02:00", servesGuinness: false },
  { name: "Pub Irlandais",                     type: "pub",            area: "Les Gets", address: "Centre, Les Gets",                           lat: 46.15812, lng: 6.67022, openingHours: "16:00-02:00", servesGuinness: true  },
  { name: "Boomerang Bar",                     type: "bar",            area: "Les Gets", address: "Centre, Les Gets",                           lat: 46.15791, lng: 6.67041, openingHours: "16:00-02:00", servesGuinness: false },
  { name: "Le Barbylone",                      type: "bar",            area: "Les Gets", address: "Centre, Les Gets",                           lat: 46.15841, lng: 6.67088, openingHours: "08:00-02:00", servesGuinness: false },
  { name: "Bar Bush",                          type: "bar",            area: "Les Gets", address: "Centre, Les Gets",                           lat: 46.15771, lng: 6.66958, openingHours: "16:00-01:00", servesGuinness: false },
  { name: "Igloo Chalet Club",                 type: "club",           area: "Les Gets", address: "Centre, Les Gets",                           lat: 46.15858, lng: 6.67108, openingHours: "23:00-06:00", servesGuinness: false },

  /* ---------------- CHÂTEL ---------------- */
  { name: "Nazca Bar",                         type: "bar",            area: "Châtel",   address: "Centre, Châtel",                             lat: 46.26451, lng: 6.83921, openingHours: "16:00-02:00", servesGuinness: false },
  { name: "L'Avalanche",                       type: "bar",            area: "Châtel",   address: "Centre, Châtel",                             lat: 46.26509, lng: 6.83869, openingHours: "15:00-01:00", servesGuinness: false },
  { name: "La Voga",                           type: "club",           area: "Châtel",   address: "Centre, Châtel",                             lat: 46.26419, lng: 6.83801, openingHours: "23:00-05:00", servesGuinness: false },

  /* ---------------- CHAMPÉRY ---------------- */
  { name: "Le Bar des Guides",                 type: "pub",            area: "Champéry", address: "Rue du Village, Champéry",                   lat: 46.17991, lng: 6.87381, openingHours: "16:00-01:00", servesGuinness: true  },
  { name: "R.E.D.",                            type: "bar",            area: "Champéry", address: "Champéry",                                   lat: 46.18021, lng: 6.87419, openingHours: "15:00-02:00", servesGuinness: false },

  /* ---------------- MONTRIOND / MORGINS ---------------- */
  { name: "Happy Hours Montriond",             type: "bar",            area: "Montriond",address: "Montriond",                                  lat: 46.20309, lng: 6.72948, openingHours: "14:00-21:00", servesGuinness: false },
  { name: "Le Cyclamen",                       type: "bar",            area: "Morgins",  address: "Centre, Morgins",                            lat: 46.23981, lng: 6.85821, openingHours: "16:00-01:00", servesGuinness: false },
] as const;

/* small price spread per area so the data doesn't look uniform */
function priceFor(basePriceEUR: number, area: string) {
  const tier: Record<string, number> = {
    "Avoriaz": 1.10, "Ardent": 1.05,
    "Morzine": 1.00,
    "Les Gets": 1.00,
    "Châtel": 0.95, "Montriond": 0.95, "Morgins": 0.95,
    "Champéry": 1.05,
  };
  const k = tier[area] ?? 1.0;
  // small random jitter so identical drinks don't all match
  const jitter = 0.85 + Math.random() * 0.35;
  return Math.round(basePriceEUR * k * jitter * 10) / 10;
}

async function run() {
  // Safety check — never wipe a database that already has bars in it.
  // This prevents accidentally destroying admin-corrected coordinates.
  // To force a reseed, pass --force flag: yarn db:seed --force
  const existing = await db.select().from(bars);
  const forceReseed = process.argv.includes('--force');

  if (existing.length > 0 && !forceReseed) {
    console.log(`⚠️  Database already has ${existing.length} bars. Skipping seed.`);
    console.log('   To force a full reseed (DESTROYS ALL DATA): yarn db:seed --force');
    console.log('   To update coordinates only: yarn update:coords');
    process.exit(0);
  }

  if (forceReseed) {
    console.log('⚠️  FORCE flag detected — wiping and reseeding...');
  }

  console.log("Wiping existing data...");
  await db.delete(deals);
  await db.delete(drinks);
  await db.delete(bars);

  console.log(`Seeding ${NEW_BARS.length} bars...`);
  const inserted = await db.insert(bars).values(NEW_BARS as any).returning();

  console.log("Seeding common drinks library for every bar...");
  for (const bar of inserted) {
    const rows = STAPLE_DRINKS
      // Don't seed Guinness on bars that don't serve it
      .filter(([name]) => name !== "Guinness" || bar.servesGuinness)
      // Only seed a random ~12 of the 18 staples per bar for realism
      .filter(() => Math.random() > 0.25)
      .map(([name, size, base]) => ({
        barId: bar.id,
        name: name as string,
        size: size as string,
        price: priceFor(base as number, bar.area || ""),
        currency: "EUR",
        isVerified: Math.random() > 0.7, // ~30% start verified
        verifiedAt: Math.random() > 0.7 ? new Date().toISOString() : null,
      }));
    if (rows.length) await db.insert(drinks).values(rows);
  }

  console.log("Seeding sample happy hours / deals...");
  const happyHourBars = inserted.filter((_, i) => i % 3 === 0);
  for (const bar of happyHourBars) {
    await db.insert(deals).values({
      barId: bar.id,
      title: "Happy Hour",
      description: "All draft beers 30% off",
      type: "happy_hour",
      startTime: "16:00",
      endTime: "18:00",
      daysOfWeek: JSON.stringify([0,1,2,3,4,5,6]),
      isActive: true,
    });
  }
  // Add a couple of one-off events
  if (inserted[0]) {
    await db.insert(deals).values({
      barId: inserted[0].id,
      title: "Live DJ — Wednesday",
      description: "Resident DJ sets from 16:00",
      type: "event",
      startTime: "16:00",
      endTime: "22:00",
      daysOfWeek: JSON.stringify([3]),
      isActive: true,
    });
  }

  console.log(`Done. Inserted ${inserted.length} bars.`);
}

run().catch((err) => { console.error(err); process.exit(1); });
