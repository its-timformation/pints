import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { bars, drinks, deals, submissions, barReports, editorsPick } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const adminRouter = router({
  resolveMapLink: publicProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;

      function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
        const at = url.match(/@(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/);
        if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
        const d3 = url.match(/!3d(-?\d{1,3}\.\d{4,})/);
        const d4 = url.match(/!4d(-?\d{1,3}\.\d{4,})/);
        if (d3 && d4) return { lat: parseFloat(d3[1]), lng: parseFloat(d4[1]) };
        const q = url.match(/[?&]q=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/);
        if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
        return null;
      }

      function extractPlaceNameFromUrl(url: string): string | null {
        const m = url.match(/\/maps\/place\/([^/@?!]+)/);
        if (!m) return null;
        return decodeURIComponent(m[1].replace(/\+/g, ' ')).replace(/\s*[-,].+$/, '').trim();
      }

      async function followRedirect(url: string): Promise<string> {
        try {
          const res = await fetch(url, {
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
              'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(8000),
          });
          return res.url;
        } catch {
          return url;
        }
      }

      async function callPlacesAPI(queries: string[]) {
        if (!apiKey) return null;

        for (const query of queries) {
          try {
            const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.displayName,places.location,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours,places.rating,places.googleMapsUri,places.formattedAddress',
              },
              body: JSON.stringify({
                textQuery: query,
                locationBias: {
                  circle: {
                    center: { latitude: 46.1893, longitude: 6.7741 },
                    radius: 50000.0,
                  },
                },
                maxResultCount: 1,
              }),
              signal: AbortSignal.timeout(8000),
            });

            if (!res.ok) {
              console.error('Places API error:', res.status, await res.text());
              continue;
            }

            const data = await res.json();
            const place = data.places?.[0];
            if (!place) continue;

            const lat = place.location?.latitude;
            const lng = place.location?.longitude;
            if (!lat || !lng || lat < 43 || lat > 48 || lng < 4 || lng > 12) continue;

            let openingHours: string | null = null;
            const periods = place.regularOpeningHours?.periods;
            if (periods?.length > 0) {
              const p = periods[0];
              if (p.open && p.close) {
                const oh = String(p.open.hour ?? 0).padStart(2, '0');
                const om = String(p.open.minute ?? 0).padStart(2, '0');
                const ch = String(p.close.hour ?? 0).padStart(2, '0');
                const cm = String(p.close.minute ?? 0).padStart(2, '0');
                openingHours = `${oh}:${om}-${ch}:${cm}`;
              }
            }

            return {
              lat, lng,
              websiteUrl: place.websiteUri ?? null,
              phoneNumber: place.nationalPhoneNumber ?? null,
              openingHours,
              rating: place.rating ?? null,
              googleMapsUrl: place.googleMapsUri ?? null,
              fullName: place.displayName?.text ?? null,
              address: place.formattedAddress ?? null,
            };
          } catch (e) {
            console.error('Places API fetch failed for query:', query, e);
          }
        }
        return null;
      }

      try {
        const finalUrl = await followRedirect(input.url);
        const placeName = extractPlaceNameFromUrl(finalUrl);

        if (apiKey && placeName) {
          const nameVariants = [
            placeName,
            placeName.replace(/^(Le|La|Les|L')\s+/i, ''),
            placeName.replace(/\s*[-,–].*$/, '').trim(),
          ].filter((v, i, arr) => v && arr.indexOf(v) === i);

          const queries = [
            ...nameVariants.map(n => `${n} Avoriaz bar`),
            ...nameVariants.map(n => `${n} French Alps bar`),
            ...nameVariants.map(n => `${n} bar`),
          ];

          const placeData = await callPlacesAPI(queries);
          if (placeData) {
            return {
              lat: placeData.lat,
              lng: placeData.lng,
              placeName: placeData.fullName ?? placeName,
              address: placeData.address,
              websiteUrl: placeData.websiteUrl,
              phoneNumber: placeData.phoneNumber,
              openingHours: placeData.openingHours,
              rating: placeData.rating,
              googleMapsUrl: placeData.googleMapsUrl ?? finalUrl,
              finalUrl: placeData.googleMapsUrl ?? finalUrl,
              source: 'places_api' as const,
            };
          }
        }

        const directCoords = extractCoordsFromUrl(finalUrl);
        if (directCoords) {
          return {
            lat: directCoords.lat,
            lng: directCoords.lng,
            placeName,
            address: null,
            websiteUrl: null,
            phoneNumber: null,
            openingHours: null,
            rating: null,
            googleMapsUrl: finalUrl,
            finalUrl,
            source: 'url' as const,
          };
        }

        throw new TRPCError({
          code: 'NOT_FOUND',
          message: placeName
            ? `Could not find "${placeName}" on Google Places. Try searching for the bar directly on maps.google.com, clicking on it, then sharing that link.`
            : 'Could not read this link. Try copying the URL from Google Maps on desktop instead.',
        });

      } catch (e: any) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to resolve link: ' + e.message,
        });
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
      googleMapsUrl: z.string().optional().nullable(),
      websiteUrl: z.string().optional().nullable(),
      phoneNumber: z.string().max(30).optional().nullable(),
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
      phoneNumber: z.string().max(30).optional().nullable(),
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
