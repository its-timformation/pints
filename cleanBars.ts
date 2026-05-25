import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./shared/schema";

const client = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.DATABASE_AUTH_TOKEN as string,
});

const db = drizzle(client, { schema });

async function clean() {
  await db.delete(schema.submissions);
  await db.delete(schema.deals);
  await db.delete(schema.drinks);
  await db.delete(schema.bars);
  
  const insertedBars = await db.insert(schema.bars).values([
    { name: "Le Shooters", type: "club", lat: 46.1932, lng: 6.7725, area: "Avoriaz", openingHours: "22:00 - 05:00" },
    { name: "La Folie Douce", type: "slope-side", lat: 46.1901, lng: 6.7711, area: "Avoriaz", openingHours: "12:00 - 18:00" },
    { name: "The Place", type: "bar", lat: 46.1938, lng: 6.773, area: "Avoriaz", openingHours: "16:00 - 02:00" },
    { name: "Globe Trotter", type: "restaurant-bar", lat: 46.191, lng: 6.771, area: "Avoriaz", openingHours: "08:00 - 02:00" },
    { name: "L'Igloo", type: "slope-side", lat: 46.18, lng: 6.78, area: "Arare", openingHours: "10:00 - 17:00" },
    { name: "Happy Hours Bar", type: "bar", lat: 46.2081, lng: 6.7441, area: "Ardent", openingHours: "14:00 - 20:00" },
    { name: "Le Yak", type: "club", lat: 46.19, lng: 6.774, area: "Avoriaz", openingHours: "00:00 - 05:00" },
    { name: "Le Tavaillon", type: "bar", lat: 46.1915, lng: 6.7705, area: "Avoriaz", openingHours: "15:00 - 02:00" },
    { name: "Bar Robinson", type: "bar", lat: 46.1802, lng: 6.7027, area: "Morzine", openingHours: "16:00 - 20:00" },
    { name: "Le Tremplin", type: "slope-side", lat: 46.1772, lng: 6.7042, area: "Morzine", openingHours: "15:00 - 20:00" },
    { name: "Dixie Bar", type: "bar", lat: 46.1814, lng: 6.7032, area: "Morzine", openingHours: "16:00 - 02:00" }
  ]).returning();
  
  await db.insert(schema.deals).values([
    {
      barId: insertedBars[5].id, // Happy Hours
      title: "Apres Ski Party",
      type: "promotion",
      startTime: "15:00",
      endTime: "18:00",
      daysOfWeek: "[0,1,2,3,4,5,6]",
      isActive: true,
    },
    {
      barId: insertedBars[1].id, // Folie Douce
      title: "Live DJ Set",
      type: "promotion",
      startTime: "14:00",
      endTime: "17:00",
      daysOfWeek: "[0,1,2,3,4,5,6]",
      isActive: true,
    }
  ]);
  
  console.log("Done");
  process.exit(0);
}

clean().catch(console.error);
