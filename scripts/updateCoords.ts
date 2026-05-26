import "dotenv/config";
import { db } from "../server/db";
import { bars } from "../shared/schema";
import { eq } from "drizzle-orm";

type CoordEntry = {
  lat: number;
  lng: number;
  address?: string;
};

// Direct coordinate overrides keyed by exact bar name.
// Add or correct entries here; run `yarn update:coords` to apply.
const COORDS: Record<string, CoordEntry> = {
  /* ── AVORIAZ ─────────────────────────────────────────────── */
  "La Folie Douce Avoriaz":            { lat: 46.19366, lng: 6.77384, address: "560A Route de l'Alpage, Avoriaz 1800" },
  "Le Tavaillon":                      { lat: 46.19092, lng: 6.77118, address: "Immeuble Les Fontaines Blanches, Avoriaz" },
  "Le Chapka":                         { lat: 46.18958, lng: 6.77213, address: "Rue du Douchka, La Falaise, Avoriaz" },
  "Le Fantastic":                      { lat: 46.19143, lng: 6.77065, address: "Place Centrale, Avoriaz 1800" },
  "Globe Trotter Café":                { lat: 46.19081, lng: 6.77052, address: "47 Place du Snow, Avoriaz 1800" },
  "Le Shooters":                       { lat: 46.19221, lng: 6.77098, address: "73 Place du Snow, Avoriaz 1800" },
  "The Place":                         { lat: 46.19162, lng: 6.77145, address: "Centre, Avoriaz 1800" },
  "Le Yak":                            { lat: 46.19055, lng: 6.77301, address: "Place des Dromonts, Avoriaz" },
  "Le Strike Roc Bowling Bar":         { lat: 46.19073, lng: 6.77248, address: "Place des Dromonts, Avoriaz" },
  "Le R Concept Store & Tasting Bar":  { lat: 46.19067, lng: 6.77228, address: "Place des Dromonts, Avoriaz" },
  "Happy Hours Bar":                   { lat: 46.20551, lng: 6.76171, address: "Foot of Ardent gondola, Ardent" },
  "Les Trappeurs":                     { lat: 46.19138, lng: 6.77172, address: "Centre, Avoriaz 1800" },
  "Wild Horse Pub":                    { lat: 46.19198, lng: 6.77031, address: "Centre station, Avoriaz 1800" },

  /* ── MORZINE ─────────────────────────────────────────────── */
  "Le Tremplin":                       { lat: 46.17951, lng: 6.70817, address: "Pleney piste, Morzine" },
  "Bar Robinson":                      { lat: 46.17893, lng: 6.70943, address: "Rue du Bourg, Morzine" },
  "The Cavern Bar":                    { lat: 46.17861, lng: 6.70897, address: "Place de l'Église, Morzine" },
  "Dixie Bar":                         { lat: 46.17881, lng: 6.70929, address: "Centre, Morzine" },
  "Bec Jaune Brewery":                 { lat: 46.17783, lng: 6.71048, address: "Route de la Plagne, Morzine" },
  "Le Tibetan Bar":                    { lat: 46.17914, lng: 6.70871, address: "Centre, Morzine" },
  "Café Chaud":                        { lat: 46.17931, lng: 6.70862, address: "Centre, Morzine" },
  "Le Crépu":                          { lat: 46.17903, lng: 6.70958, address: "Place du Bourg, Morzine" },
  "Cookie Café":                       { lat: 46.18448, lng: 6.71483, address: "Top of Super Morzine" },
  "Le Club at Névé":                   { lat: 46.17852, lng: 6.71019, address: "Hotel Névé, Morzine" },
  "Le Coup de Cœur":                   { lat: 46.17841, lng: 6.70843, address: "Centre, Morzine" },

  /* ── LES GETS ────────────────────────────────────────────── */
  "L'Aprèski Bar":                     { lat: 46.15741, lng: 6.66779, address: "Foot of Chavannes piste, Les Gets" },
  "Le Bellevue":                       { lat: 46.15823, lng: 6.67058, address: "Centre, Les Gets" },
  "Black Bear Bar":                    { lat: 46.15801, lng: 6.67001, address: "Centre, Les Gets" },
  "Pub Irlandais":                     { lat: 46.15812, lng: 6.67022, address: "Centre, Les Gets" },
  "Boomerang Bar":                     { lat: 46.15791, lng: 6.67041, address: "Centre, Les Gets" },
  "Le Barbylone":                      { lat: 46.15841, lng: 6.67088, address: "Centre, Les Gets" },
  "Bar Bush":                          { lat: 46.15771, lng: 6.66958, address: "Centre, Les Gets" },
  "Igloo Chalet Club":                 { lat: 46.15858, lng: 6.67108, address: "Centre, Les Gets" },

  /* ── CHÂTEL ──────────────────────────────────────────────── */
  "Nazca Bar":                         { lat: 46.26451, lng: 6.83921, address: "Centre, Châtel" },
  "L'Avalanche":                       { lat: 46.26509, lng: 6.83869, address: "Centre, Châtel" },
  "La Voga":                           { lat: 46.26419, lng: 6.83801, address: "Centre, Châtel" },

  /* ── CHAMPÉRY ────────────────────────────────────────────── */
  "Le Bar des Guides":                 { lat: 46.17991, lng: 6.87381, address: "Rue du Village, Champéry" },
  "R.E.D.":                            { lat: 46.18021, lng: 6.87419, address: "Champéry" },

  /* ── MONTRIOND / MORGINS ─────────────────────────────────── */
  "Happy Hours Montriond":             { lat: 46.20309, lng: 6.72948, address: "Montriond" },
  "Le Cyclamen":                       { lat: 46.23981, lng: 6.85821, address: "Centre, Morgins" },
};

async function run() {
  const allBars = await db.select({ id: bars.id, name: bars.name }).from(bars);
  console.log(`Found ${allBars.length} bars in database.`);

  let updated = 0;
  const notFound: string[] = [];

  for (const [name, coords] of Object.entries(COORDS)) {
    const match = allBars.find(b => b.name === name);
    if (!match) {
      notFound.push(name);
      continue;
    }
    const values: Record<string, unknown> = { lat: coords.lat, lng: coords.lng };
    if (coords.address) values.address = coords.address;
    await db.update(bars).set(values as any).where(eq(bars.id, match.id));
    console.log(`  ✓ ${name}`);
    updated++;
  }

  if (notFound.length) {
    console.log(`\nNot found in DB (${notFound.length}):`);
    notFound.forEach(n => console.log(`  ✗ ${n}`));
  }

  console.log(`\nDone. Updated ${updated}/${Object.keys(COORDS).length} bars.`);
}

run().catch(err => { console.error(err); process.exit(1); });
