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
  "La Folie Douce Avoriaz":         { lat: 46.19366, lng: 6.77384, address: "560A Route de l'Alpage, Avoriaz 1800" },
  "Le Tavaillon":                   { lat: 46.19080, lng: 6.77120, address: "Place des Dromonts, Avoriaz 1800" },
  "Le Chapka":                      { lat: 46.18920, lng: 6.77180, address: "Rue du Douchka, Quartier La Falaise, Avoriaz" },
  "Le Fantastic":                   { lat: 46.19150, lng: 6.77080, address: "Place Centrale, Avoriaz 1800" },
  "Globe Trotter Café":             { lat: 46.19128, lng: 6.77055, address: "47 Place du Snow, Avoriaz 1800" },
  "Le Shooters":                    { lat: 46.19220, lng: 6.77150, address: "Centre station, Avoriaz" },
  "The Place":                      { lat: 46.19170, lng: 6.77220, address: "Centre, Avoriaz" },
  "Le Yak":                         { lat: 46.19080, lng: 6.77300, address: "Place des Dromonts, Avoriaz" },
  "Le Strike Roc Bowling Bar":      { lat: 46.19090, lng: 6.77250, address: "Place des Dromonts, Avoriaz" },
  "Le R Concept Store & Tasting Bar": { lat: 46.19070, lng: 6.77230, address: "Place des Dromonts, Avoriaz" },
  "Happy Hours Bar":                { lat: 46.20550, lng: 6.76170, address: "Foot of Ardent gondola, Ardent" },
  "Les Trappeurs":                  { lat: 46.19140, lng: 6.77170, address: "Centre, Avoriaz" },
  "Wild Horse Pub":                 { lat: 46.19200, lng: 6.77040, address: "Centre station, Avoriaz" },

  /* ── MORZINE ─────────────────────────────────────────────── */
  "Le Tremplin":                    { lat: 46.17950, lng: 6.70820, address: "Pleney piste, Morzine" },
  "Bar Robinson":                   { lat: 46.17890, lng: 6.70950, address: "Rue du Bourg, Morzine" },
  "The Cavern Bar":                 { lat: 46.17860, lng: 6.70900, address: "Place de l'Église, Morzine" },
  "Dixie Bar":                      { lat: 46.17880, lng: 6.70930, address: "Centre, Morzine" },
  "Bec Jaune Brewery":              { lat: 46.17780, lng: 6.71050, address: "Route de la Plagne, Morzine" },
  "Le Tibetan Bar":                 { lat: 46.17910, lng: 6.70870, address: "Centre, Morzine" },
  "Café Chaud":                     { lat: 46.17930, lng: 6.70860, address: "Centre, Morzine" },
  "Le Crépu":                       { lat: 46.17900, lng: 6.70960, address: "Place du Bourg, Morzine" },
  "Cookie Café":                    { lat: 46.18450, lng: 6.71480, address: "Top of Super Morzine" },
  "Le Club at Névé":                { lat: 46.17850, lng: 6.71020, address: "Hotel Névé, Morzine" },
  "Le Coup de Cœur":                { lat: 46.17840, lng: 6.70840, address: "Opposite La Chamade, Morzine" },

  /* ── LES GETS ────────────────────────────────────────────── */
  "L'Aprèski Bar":                  { lat: 46.15740, lng: 6.66780, address: "Foot of Chavannes piste, Les Gets" },
  "Le Bellevue":                    { lat: 46.15820, lng: 6.67060, address: "Centre, Les Gets" },
  "Black Bear Bar":                 { lat: 46.15800, lng: 6.67000, address: "Centre, Les Gets" },
  "Pub Irlandais":                  { lat: 46.15810, lng: 6.67020, address: "Centre, Les Gets" },
  "Boomerang Bar":                  { lat: 46.15790, lng: 6.67040, address: "Centre, Les Gets" },
  "Le Barbylone":                   { lat: 46.15840, lng: 6.67090, address: "Centre, Les Gets" },
  "Bar Bush":                       { lat: 46.15770, lng: 6.66960, address: "Centre, Les Gets" },
  "Igloo Chalet Club":              { lat: 46.15860, lng: 6.67110, address: "Centre, Les Gets" },

  /* ── CHÂTEL ──────────────────────────────────────────────── */
  "Nazca Bar":                      { lat: 46.26450, lng: 6.83920, address: "Centre, Châtel" },
  "L'Avalanche":                    { lat: 46.26510, lng: 6.83870, address: "Centre, Châtel" },
  "La Voga":                        { lat: 46.26420, lng: 6.83800, address: "Centre, Châtel" },

  /* ── CHAMPÉRY ────────────────────────────────────────────── */
  "Le Bar des Guides":              { lat: 46.17990, lng: 6.87380, address: "Rue du Village, Champéry" },
  "R.E.D.":                         { lat: 46.18020, lng: 6.87420, address: "Champéry" },

  /* ── MONTRIOND / MORGINS ─────────────────────────────────── */
  "Happy Hours Montriond":          { lat: 46.20310, lng: 6.72950, address: "Montriond" },
  "Le Cyclamen":                    { lat: 46.23980, lng: 6.85820, address: "Centre, Morgins" },
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
