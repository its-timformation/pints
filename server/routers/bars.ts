import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { bars, drinks, deals, submissions, barReports, editorsPick } from "../../shared/schema";
import { eq, desc, like, asc } from "drizzle-orm";
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
      db.select().from(drinks).orderBy(asc(drinks.name)),
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
      const barDrinks = await db.select().from(drinks).where(eq(drinks.barId, bar.id)).orderBy(asc(drinks.name));
      const barDeals = await db.select().from(deals).where(eq(deals.barId, bar.id));
      return { ...bar, drinks: barDrinks, deals: barDeals };
    }),

  getDeals: publicProcedure.query(async () => {
    return db.select().from(deals);
  }),

  searchDrinkNames: publicProcedure
    .input(z.object({ q: z.string() }))
    .query(async ({ input }) => {
      const q = input.q.trim();
      if (!q) return [] as string[];
      const rows = await db
        .select({ name: drinks.name })
        .from(drinks)
        .where(like(drinks.name, `%${q}%`))
        .groupBy(drinks.name)
        .limit(8);
      return rows.map(r => r.name);
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
      if (!ctx.isAdmin) {
        const limit = rateLimit(`submit:${ctx.ip}`, { windowMs: 60 * 60 * 1000, max: 5 });
        if (!limit.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `You've submitted a lot lately. Try again in ${Math.ceil(limit.retryAfterMs / 60000)} minutes.`,
          });
        }
      }
      const inserted = await db.insert(submissions).values({
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

      return inserted;
    }),

  report: publicProcedure
    .input(z.object({
      barId: z.number(),
      reason: z.enum(["closed", "wrong_info", "drink_not_served", "other"]),
      detail: z.string().max(500).optional(),
      reporterName: z.string().max(32).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.isAdmin) {
        const limit = rateLimit(`report:${ctx.ip}`, { windowMs: 60 * 60 * 1000, max: 10 });
        if (!limit.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Too many reports. Try again in ${Math.ceil(limit.retryAfterMs / 60000)} minutes.`,
          });
        }
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

  getEditorsPick: publicProcedure.query(async () => {
    const [cfg] = await db.select().from(editorsPick).limit(1);
    const mode = cfg?.mode ?? "cheapest";

    const [allBars, allDrinks] = await Promise.all([
      db.select().from(bars),
      db.select().from(drinks),
    ]);

    const beerRe = /lager|beer|pint|kronen|stella|heineken|guinness|ipa|carlsberg|1664|mutzig/i;

    const getCheapestBeer = (barId: number) => {
      const beers = allDrinks.filter(d => d.barId === barId && beerRe.test(d.name));
      if (!beers.length) return null;
      return beers.reduce((min, d) => d.price < min.price ? d : min, beers[0]);
    };

    let selectedBar: typeof allBars[0] | undefined;

    if (mode === "cheapest") {
      selectedBar = allBars
        .filter(b => getCheapestBeer(b.id) !== null)
        .sort((a, b) => (getCheapestBeer(a.id)?.price ?? Infinity) - (getCheapestBeer(b.id)?.price ?? Infinity))[0];
    } else if (mode === "manual" && cfg?.barId) {
      selectedBar = allBars.find(b => b.id === cfg.barId);
    } else if (mode === "daily_random" || mode === "weekly_random") {
      const key = mode === "daily_random"
        ? new Date().toISOString().slice(0, 10)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() - d.getDay());
            return d.toISOString().slice(0, 10);
          })();

      if (cfg?.lastRandomDate === key && cfg?.lastRandomBarId) {
        selectedBar = allBars.find(b => b.id === cfg.lastRandomBarId);
      } else {
        const eligible = allBars.filter(b => getCheapestBeer(b.id) !== null);
        if (eligible.length) {
          selectedBar = eligible[Math.floor(Math.random() * eligible.length)];
          if (cfg) {
            await db.update(editorsPick)
              .set({ lastRandomBarId: selectedBar.id, lastRandomDate: key })
              .where(eq(editorsPick.id, cfg.id));
          }
        }
      }
    }

    if (!selectedBar) return null;
    return { bar: selectedBar, cheapestBeer: getCheapestBeer(selectedBar.id), mode };
  }),
});
