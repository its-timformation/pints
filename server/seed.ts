import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../shared/schema";

const client = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.DATABASE_AUTH_TOKEN as string,
});

const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding data...");

  // Insert bars
  const insertedBars = await db.insert(schema.bars).values([
    {
      name: "Le Shooters",
      type: "bar",
      area: "Avoriaz 1800",
      lat: 46.1932,
      lng: 6.7725,
      openingHours: "16:00 - 02:00",
    },
    {
      name: "La Folie Douce",
      type: "slope-side",
      area: "Avoriaz Slopes",
      lat: 46.1901,
      lng: 6.7711,
      openingHours: "12:00 - 18:00",
    },
    {
      name: "The Place",
      type: "bar",
      area: "Avoriaz 1800",
      lat: 46.1938,
      lng: 6.7730,
      openingHours: "16:00 - 02:00",
    },
  ]).returning();

  console.log("Inserted bars:", insertedBars.length);

  // Insert drinks
  if (insertedBars.length >= 3) {
    await db.insert(schema.drinks).values([
      { barId: insertedBars[0].id, name: "Pint of Lager", price: 7.5, currency: "EUR", isVerified: true },
      { barId: insertedBars[1].id, name: "Pint of Lager", price: 12.0, currency: "EUR", isVerified: true },
      { barId: insertedBars[2].id, name: "Pint of Lager", price: 8.0, currency: "EUR", isVerified: false },
    ]);
    console.log("Inserted drinks");

    // Insert deals
    await db.insert(schema.deals).values([
      {
        barId: insertedBars[0].id,
        title: "Happy Hour",
        type: "happy_hour",
        startTime: "16:00",
        endTime: "18:00",
        daysOfWeek: "[0,1,2,3,4,5,6]",
        isActive: true,
      }
    ]);
    console.log("Inserted deals");
  }

  console.log("Done");
  process.exit(0);
}

seed().catch(console.error);
