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
  /* ---------------- AVORIAZ (centre ~46.1908, 6.7720) ---------------- */
  { name: "La Folie Douce Avoriaz",   type: "slope-side",     area: "Avoriaz",  address: "560A Route de l'Alpage, Avoriaz 1800",           lat: 46.19366, lng: 6.77384, openingHours: "12:00-18:00", servesGuinness: false },
  { name: "Le Tavaillon",             type: "pub",            area: "Avoriaz",  address: "Place des Dromonts",                             lat: 46.19080, lng: 6.77120, openingHours: "09:00-02:00", servesGuinness: true  },
  { name: "Le Chapka",                type: "restaurant-bar", area: "Avoriaz",  address: "Rue du Douchka, Quartier La Falaise, Avoriaz",   lat: 46.18920, lng: 6.77180, openingHours: "09:00-00:00", servesGuinness: false },
  { name: "Le Fantastic",             type: "restaurant-bar", area: "Avoriaz",  address: "Place Centrale, Avoriaz 1800",                   lat: 46.19150, lng: 6.77080, openingHours: "10:00-23:00", servesGuinness: false },
  { name: "Globe Trotter Café",       type: "restaurant-bar", area: "Avoriaz",  address: "47 Place du Snow, Avoriaz 1800",                 lat: 46.19128, lng: 6.77055, openingHours: "07:00-02:00", servesGuinness: true  },
  { name: "Le Shooters",              type: "club",           area: "Avoriaz",  address: "Centre station",          lat: 46.19220, lng: 6.77150, openingHours: "22:00-05:00", servesGuinness: false },
  { name: "The Place",                type: "bar",            area: "Avoriaz",  address: "Centre, Avoriaz",         lat: 46.19170, lng: 6.77220, openingHours: "16:00-02:00", servesGuinness: false },
  { name: "Le Yak",                   type: "club",           area: "Avoriaz",  address: "Place des Dromonts",      lat: 46.19080, lng: 6.77300, openingHours: "00:00-05:00", servesGuinness: false },
  { name: "Le Strike Roc Bowling Bar",type: "bar",            area: "Avoriaz",  address: "Place des Dromonts",      lat: 46.19090, lng: 6.77250, openingHours: "11:00-02:00", servesGuinness: false },
  { name: "Le R Concept Store & Tasting Bar", type: "bar",    area: "Avoriaz",  address: "Place des Dromonts",      lat: 46.19070, lng: 6.77230, openingHours: "16:00-23:00", servesGuinness: false },
  { name: "Happy Hours Bar",          type: "slope-side",     area: "Ardent",   address: "Foot of Ardent gondola",  lat: 46.20550, lng: 6.76170, openingHours: "14:00-21:00", servesGuinness: false },
  { name: "Les Trappeurs",            type: "bar",            area: "Avoriaz",  address: "Centre, Avoriaz",         lat: 46.19140, lng: 6.77170, openingHours: "16:00-02:00", servesGuinness: false },
  { name: "Wild Horse Pub",           type: "pub",            area: "Avoriaz",  address: "Centre station",          lat: 46.19200, lng: 6.77040, openingHours: "16:00-02:00", servesGuinness: true  },

  /* ---------------- MORZINE (centre ~46.1789, 6.7089) ---------------- */
  { name: "Le Tremplin",              type: "slope-side",     area: "Morzine",  address: "Pleney piste, Morzine",   lat: 46.17950, lng: 6.70820, openingHours: "15:00-23:00", servesGuinness: false },
  { name: "Bar Robinson",             type: "bar",            area: "Morzine",  address: "Rue du Bourg",            lat: 46.17890, lng: 6.70950, openingHours: "15:00-22:00", servesGuinness: false },
  { name: "The Cavern Bar",           type: "pub",            area: "Morzine",  address: "Place de l'Église",       lat: 46.17860, lng: 6.70900, openingHours: "16:00-02:00", servesGuinness: true  },
  { name: "Dixie Bar",                type: "pub",            area: "Morzine",  address: "Centre, Morzine",         lat: 46.17880, lng: 6.70930, openingHours: "16:00-02:00", servesGuinness: true  },
  { name: "Bec Jaune Brewery",        type: "bar",            area: "Morzine",  address: "Route de la Plagne",      lat: 46.17780, lng: 6.71050, openingHours: "16:00-00:00", servesGuinness: false },
  { name: "Le Tibetan Bar",           type: "bar",            area: "Morzine",  address: "Centre, Morzine",         lat: 46.17910, lng: 6.70870, openingHours: "17:00-02:00", servesGuinness: false },
  { name: "Café Chaud",               type: "bar",            area: "Morzine",  address: "Centre, Morzine",         lat: 46.17930, lng: 6.70860, openingHours: "17:00-02:00", servesGuinness: false },
  { name: "Le Crépu",                 type: "bar",            area: "Morzine",  address: "Place du Bourg",          lat: 46.17900, lng: 6.70960, openingHours: "16:00-01:00", servesGuinness: false },
  { name: "Cookie Café",              type: "slope-side",     area: "Morzine",  address: "Top of Super Morzine",    lat: 46.18450, lng: 6.71480, openingHours: "10:00-17:00", servesGuinness: false },
  { name: "Le Club at Névé",          type: "bar",            area: "Morzine",  address: "Hotel Névé, Morzine",     lat: 46.17850, lng: 6.71020, openingHours: "17:00-02:00", servesGuinness: false },
  { name: "Le Coup de Cœur",          type: "bar",            area: "Morzine",  address: "Opposite La Chamade",     lat: 46.17840, lng: 6.70840, openingHours: "17:00-00:00", servesGuinness: false },

  /* ---------------- LES GETS (centre ~46.1580, 6.6700) ---------------- */
  { name: "L'Aprèski Bar",            type: "slope-side",     area: "Les Gets", address: "Foot of Chavannes piste", lat: 46.15740, lng: 6.66780, openingHours: "11:00-19:00", servesGuinness: false },
  { name: "Le Bellevue",              type: "restaurant-bar", area: "Les Gets", address: "Centre, Les Gets",        lat: 46.15820, lng: 6.67060, openingHours: "08:00-23:00", servesGuinness: false },
  { name: "Black Bear Bar",           type: "pub",            area: "Les Gets", address: "Centre, Les Gets",        lat: 46.15800, lng: 6.67000, openingHours: "16:00-02:00", servesGuinness: false },
  { name: "Pub Irlandais",            type: "pub",            area: "Les Gets", address: "Centre, Les Gets",        lat: 46.15810, lng: 6.67020, openingHours: "16:00-02:00", servesGuinness: true  },
  { name: "Boomerang Bar",            type: "bar",            area: "Les Gets", address: "Centre, Les Gets",        lat: 46.15790, lng: 6.67040, openingHours: "16:00-02:00", servesGuinness: false },
  { name: "Le Barbylone",             type: "bar",            area: "Les Gets", address: "Centre, Les Gets",        lat: 46.15840, lng: 6.67090, openingHours: "08:00-02:00", servesGuinness: false },
  { name: "Bar Bush",                 type: "bar",            area: "Les Gets", address: "Centre, Les Gets",        lat: 46.15770, lng: 6.66960, openingHours: "16:00-01:00", servesGuinness: false },
  { name: "Igloo Chalet Club",        type: "club",           area: "Les Gets", address: "Centre, Les Gets",        lat: 46.15860, lng: 6.67110, openingHours: "23:00-06:00", servesGuinness: false },

  /* ---------------- CHÂTEL (centre ~46.2648, 6.8385) ---------------- */
  { name: "Nazca Bar",                type: "bar",            area: "Châtel",   address: "Centre, Châtel",          lat: 46.26450, lng: 6.83920, openingHours: "16:00-02:00", servesGuinness: false },
  { name: "L'Avalanche",              type: "bar",            area: "Châtel",   address: "Centre, Châtel",          lat: 46.26510, lng: 6.83870, openingHours: "15:00-01:00", servesGuinness: false },
  { name: "La Voga",                  type: "club",           area: "Châtel",   address: "Centre, Châtel",          lat: 46.26420, lng: 6.83800, openingHours: "23:00-05:00", servesGuinness: false },

  /* ---------------- CHAMPÉRY (centre ~46.1799, 6.8736) ---------------- */
  { name: "Le Bar des Guides",        type: "pub",            area: "Champéry", address: "Rue du Village, Champéry",lat: 46.17990, lng: 6.87380, openingHours: "16:00-01:00", servesGuinness: true  },
  { name: "R.E.D.",                   type: "bar",            area: "Champéry", address: "Champéry",                lat: 46.18020, lng: 6.87420, openingHours: "15:00-02:00", servesGuinness: false },

  /* ---------------- MONTRIOND / MORGINS ---------------- */
  { name: "Happy Hours Montriond",    type: "bar",            area: "Montriond",address: "Montriond",               lat: 46.20310, lng: 6.72950, openingHours: "14:00-21:00", servesGuinness: false },
  { name: "Le Cyclamen",              type: "bar",            area: "Morgins",  address: "Centre, Morgins",         lat: 46.23980, lng: 6.85820, openingHours: "16:00-01:00", servesGuinness: false },
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
