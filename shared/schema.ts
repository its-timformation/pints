import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const bars = sqliteTable("bars", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // bar, restaurant-bar, slope-side, club, pub
  address: text("address"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  area: text("area"), // e.g. "Avoriaz", "Morzine", "Les Gets"
  imageUrl: text("image_url"),
  openingHours: text("opening_hours"), // simple string "HH:MM-HH:MM" or JSON
  servesGuinness: integer("serves_guinness", { mode: "boolean" }).default(false).notNull(),
  googleMapsUrl: text("google_maps_url"),
  websiteUrl: text("website_url"),
  phoneNumber: text("phone_number"),
  rating: real("rating"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const drinks = sqliteTable("drinks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barId: integer("bar_id").references(() => bars.id).notNull(),
  name: text("name").notNull(),
  size: text("size"), // "Pint", "50cl", "25cl", "Shot"
  price: real("price").notNull(),
  currency: text("currency").default("EUR").notNull(),
  isVerified: integer("is_verified", { mode: "boolean" }).default(false).notNull(),
  verifiedAt: text("verified_at"), // ISO; used to age verification after 60 days
  lastUpdated: text("last_updated").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barId: integer("bar_id").references(() => bars.id).notNull(),
  drinkName: text("drink_name").notNull(),
  drinkSize: text("drink_size"),
  price: real("price").notNull(),
  currency: text("currency").default("EUR").notNull(),
  imageUrl: text("image_url"), // optional photo proof (receipt or menu)
  submitterName: text("submitter_name"), // optional display name
  kind: text("kind").default("new").notNull(), // "new" | "update"
  previousPrice: real("previous_price"), // populated for update submissions
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const deals = sqliteTable("deals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barId: integer("bar_id").references(() => bars.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'happy_hour', 'promotion', 'event'
  startTime: text("start_time"), // HH:mm
  endTime: text("end_time"), // HH:mm
  daysOfWeek: text("days_of_week"), // JSON array
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
});

// Bar reports — anyone can flag a bar (closed, wrong info, drink not served)
export const barReports = sqliteTable("bar_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barId: integer("bar_id").references(() => bars.id).notNull(),
  reason: text("reason").notNull(), // 'closed', 'wrong_info', 'drink_not_served', 'other'
  detail: text("detail"),
  reporterName: text("reporter_name"),
  status: text("status").default("open").notNull(), // open, resolved, dismissed
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Admin-configurable editor's pick — single-row config
export const editorsPick = sqliteTable("editors_pick", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mode: text("mode").default("cheapest").notNull(), // cheapest | manual | daily_random | weekly_random
  barId: integer("bar_id").references(() => bars.id),
  lastRandomBarId: integer("last_random_bar_id"),
  lastRandomDate: text("last_random_date"),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Anonymous PWA push subscriptions — no auth required
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  authKey: text("auth_key").notNull(),
  favouriteBarIds: text("favourite_bar_ids"), // JSON array of bar IDs the user has favourited
  topics: text("topics"), // JSON array: 'happy_hours', 'promos', 'events'
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Infer types
export type Bar = typeof bars.$inferSelect;
export type InsertBar = typeof bars.$inferInsert;

export type Drink = typeof drinks.$inferSelect;
export type InsertDrink = typeof drinks.$inferInsert;

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;

export type BarReport = typeof barReports.$inferSelect;
export type InsertBarReport = typeof barReports.$inferInsert;

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

export type EditorsPick = typeof editorsPick.$inferSelect;
export type InsertEditorsPick = typeof editorsPick.$inferInsert;
