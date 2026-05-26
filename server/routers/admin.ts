import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { bars, drinks, deals, submissions, barReports, editorsPick } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { rateLimitOrSkip } from "../rateLimit";
import { resolveGoogleMapsLink } from "../utils/extractMapCoords";

export const adminRouter = router({
  resolveMapLink: publicProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const limit = rateLimitOrSkip(`mapslink:${ctx.ip}`, { windowMs: 60 * 60 * 1000, max: 200 }, true);
      if (!limit.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests" });
      try {
        return await resolveGoogleMapsLink(input.url);
      } catch (e: any) {
        throw new TRPCError({ code: "NOT_FOUND", message: e.message });
      }
    }),

  getSubmissions: publicProcedure
    .query(async () => {
      return db.select().from(submissions).orderBy(desc(submissions.createdAt));
    }),

  resolveSubmission: publicProcedure
    .input(z.object({
      id: z.number(),
      action: z.enum(["approve", "approve_verified", "reject"]),
    }))
    .mutation(async ({ input }) => {
      const [sub] = await db.select().from(submissions).where(eq(submissions.id, input.id));
      if (!sub) throw new Error("Not found");

      if (input.action === "approve" || input.action === "approve_verified") {
        const isVerified = input.action === "approve_verified";
        const verifiedAt = isVerified ? new Date().toISOString() : null;

        if (sub.kind === "update") {
          // Try to find existing drink to update in place
          const existing = await db.select().from(drinks)
            .where(eq(drinks.barId, sub.barId));
          const match = existing.find(d => d.name.toLowerCase() === sub.drinkName.toLowerCase());
          if (match) {
            await db.update(drinks).set({
              price: sub.price,
              currency: sub.currency,
              size: sub.drinkSize ?? match.size,
              isVerified,
              verifiedAt,
              lastUpdated: new Date().toISOString(),
            }).where(eq(drinks.id, match.id));
          } else {
            // Update submission for a drink that no longer exists — insert as new
            await db.insert(drinks).values({
              barId: sub.barId,
              name: sub.drinkName,
              size: sub.drinkSize,
              price: sub.price,
              currency: sub.currency,
              isVerified,
              verifiedAt,
            });
          }
        } else {
          await db.insert(drinks).values({
            barId: sub.barId,
            name: sub.drinkName,
            size: sub.drinkSize,
            price: sub.price,
            currency: sub.currency,
            isVerified,
            verifiedAt,
          });
        }
      }

      await db.update(submissions)
        .set({ status: input.action === "reject" ? "rejected" : "approved" })
        .where(eq(submissions.id, input.id));
      return { success: true };
    }),

  createBar: publicProcedure
    .input(z.object({
      name: z.string(),
      type: z.string(),
      address: z.string().optional(),
      lat: z.number(),
      lng: z.number(),
      area: z.string().optional(),
      openingHours: z.string().optional(),
      imageUrl: z.string().optional(),
      servesGuinness: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.insert(bars).values(input).returning();
    }),

  createDrink: publicProcedure
    .input(z.object({
      barId: z.number(),
      name: z.string(),
      size: z.string().optional(),
      price: z.number(),
      currency: z.string().default("EUR"),
      isVerified: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      return db.insert(drinks).values({
        ...input,
        verifiedAt: input.isVerified ? new Date().toISOString() : null,
      }).returning();
    }),

  createDeal: publicProcedure
    .input(z.object({
      barId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      type: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      daysOfWeek: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      return db.insert(deals).values(input).returning();
    }),

  deleteBar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(drinks).where(eq(drinks.barId, input.id));
      await db.delete(deals).where(eq(deals.barId, input.id));
      await db.delete(submissions).where(eq(submissions.barId, input.id));
      await db.delete(barReports).where(eq(barReports.barId, input.id));
      return db.delete(bars).where(eq(bars.id, input.id)).returning();
    }),

  updateBar: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string(),
      type: z.string(),
      address: z.string().optional().nullable(),
      lat: z.number(),
      lng: z.number(),
      area: z.string().optional().nullable(),
      openingHours: z.string().optional().nullable(),
      imageUrl: z.string().optional().nullable(),
      servesGuinness: z.boolean().optional(),
      googleMapsUrl: z.string().optional().nullable(),
      websiteUrl: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.update(bars).set(data).where(eq(bars.id, id)).returning();
    }),

  deleteDrink: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.delete(drinks).where(eq(drinks.id, input.id)).returning();
    }),

  updateDrink: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string(),
      price: z.number(),
      currency: z.string(),
      size: z.string().optional(),
      isVerified: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.update(drinks).set({
        ...data,
        lastUpdated: new Date().toISOString(),
        ...(data.isVerified !== undefined ? { verifiedAt: data.isVerified ? new Date().toISOString() : null } : {}),
      }).where(eq(drinks.id, id)).returning();
    }),

  // Ad-hoc verify/unverify toggle from the Drinks Catalogue
  setDrinkVerification: publicProcedure
    .input(z.object({ id: z.number(), isVerified: z.boolean() }))
    .mutation(async ({ input }) => {
      return db.update(drinks).set({
        isVerified: input.isVerified,
        verifiedAt: input.isVerified ? new Date().toISOString() : null,
      }).where(eq(drinks.id, input.id)).returning();
    }),

  deleteDeal: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.delete(deals).where(eq(deals.id, input.id)).returning();
    }),

  updateDeal: publicProcedure
    .input(z.object({
      id: z.number(),
      title: z.string(),
      description: z.string().optional().nullable(),
      type: z.string(),
      startTime: z.string().optional().nullable(),
      endTime: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.update(deals).set(data).where(eq(deals.id, id)).returning();
    }),

  setDealActive: publicProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return db.update(deals).set({ isActive: input.isActive }).where(eq(deals.id, input.id)).returning();
    }),

  // Editor's Pick config
  getEditorsPick: publicProcedure.query(async () => {
    const [row] = await db.select().from(editorsPick).limit(1);
    return row ?? { id: null, mode: "cheapest", barId: null, lastRandomBarId: null, lastRandomDate: null };
  }),

  setEditorsPick: publicProcedure
    .input(z.object({
      mode: z.enum(["cheapest", "manual", "daily_random", "weekly_random"]),
      barId: z.number().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const [existing] = await db.select().from(editorsPick).limit(1);
      if (existing) {
        return db.update(editorsPick)
          .set({ mode: input.mode, barId: input.barId ?? null, updatedAt: new Date().toISOString() })
          .where(eq(editorsPick.id, existing.id))
          .returning();
      }
      return db.insert(editorsPick).values({ mode: input.mode, barId: input.barId ?? null }).returning();
    }),

  // Reports
  resolveReport: publicProcedure
    .input(z.object({ id: z.number(), status: z.enum(["resolved", "dismissed"]) }))
    .mutation(async ({ input }) => {
      return db.update(barReports).set({ status: input.status }).where(eq(barReports.id, input.id)).returning();
    }),
});
