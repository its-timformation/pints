import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { bars, drinks, deals, submissions, barReports } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { rateLimit } from "../rateLimit";

export const barsRouter = router({
  getAll: publicProcedure.query(async () => {
    return db.select().from(bars);
  }),

  /**
   * Returns every bar with its drinks and deals folded in. Used by every list
   * surface (Dashboard, ListPage, MapPage, DrinksCatalogue) so the client can
   * render in one round-trip and avoid the hooks-in-a-loop antipattern.
   */
  getAllWithDetails: publicProcedure.query(async () => {
    const [barList, drinkList, dealList] = await Promise.all([
      db.select().from(bars),
      db.select().from(drinks),
      db.select().from(deals),
    ]);
    const drinksByBar = new Map<number, typeof drinkList>();
    const dealsByBar = new Map<number, typeof dealList>();
    for (const d of drinkList) {
      const arr = drinksByBar.get(d.barId) ?? [];
      arr.push(d);
      drinksByBar.set(d.barId, arr);
    }
    for (const d of dealList) {
      const arr = dealsByBar.get(d.barId) ?? [];
      arr.push(d);
      dealsByBar.set(d.barId, arr);
    }
    return barList.map(b => ({
      ...b,
      drinks: drinksByBar.get(b.id) ?? [],
      deals:  dealsByBar.get(b.id) ?? [],
    }));
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const barList = await db.select().from(bars).where(eq(bars.id, input.id));
      const bar = barList[0];
      if (!bar) throw new Error("Not found");
      const barDrinks = await db.select().from(drinks).where(eq(drinks.barId, bar.id));
      const barDeals = await db.select().from(deals).where(eq(deals.barId, bar.id));
      return { ...bar, drinks: barDrinks, deals: barDeals };
    }),

  getDeals: publicProcedure.query(async () => {
    return db.select().from(deals);
  }),

  submitPrice: publicProcedure
    .input(z.object({
      barId: z.number(),
      drinkName: z.string().min(1).max(80),
      drinkSize: z.string().max(20).optional(),
      price: z.number().min(0).max(1000),
      currency: z.string().length(3).default("EUR"),
      imageUrl: z.string().url().max(500).optional(),
      submitterName: z.string().max(32).optional(),
      kind: z.enum(["new", "update"]).default("new"),
      previousPrice: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Anti-spam: 5 submissions per IP per hour
      const limit = rateLimit(`submit:${ctx.ip}`, { windowMs: 60 * 60 * 1000, max: 5 });
      if (!limit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `You've submitted a lot lately. Try again in ${Math.ceil(limit.retryAfterMs / 60000)} minutes.`,
        });
      }
      return db.insert(submissions).values({
        barId: input.barId,
        drinkName: input.drinkName,
        drinkSize: input.drinkSize,
        price: input.price,
        currency: input.currency,
        imageUrl: input.imageUrl,
        submitterName: input.submitterName,
        kind: input.kind,
        previousPrice: input.previousPrice,
        status: "pending",
      }).returning();
    }),

  report: publicProcedure
    .input(z.object({
      barId: z.number(),
      reason: z.enum(["closed", "wrong_info", "drink_not_served", "other"]),
      detail: z.string().max(500).optional(),
      reporterName: z.string().max(32).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Anti-spam: 10 reports per IP per hour
      const limit = rateLimit(`report:${ctx.ip}`, { windowMs: 60 * 60 * 1000, max: 10 });
      if (!limit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many reports. Try again in ${Math.ceil(limit.retryAfterMs / 60000)} minutes.`,
        });
      }
      return db.insert(barReports).values({
        barId: input.barId,
        reason: input.reason,
        detail: input.detail,
        reporterName: input.reporterName,
        status: "open",
      }).returning();
    }),

  getReports: publicProcedure.query(async () => {
    return db.select().from(barReports).orderBy(desc(barReports.createdAt));
  }),
});
