import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./shared/schema";

const client = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.DATABASE_AUTH_TOKEN as string,
});

const db = drizzle(client, { schema });

async function get() {
  const bars = await db.select().from(schema.bars);
  console.log(JSON.stringify(bars, null, 2));
  process.exit(0);
}

get();
