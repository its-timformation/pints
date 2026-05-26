import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import crypto from "node:crypto";
import { addAdminSession } from "../adminSession";

/**
 * Server-side PIN gate. The PIN never reaches the client bundle — the client
 * sends a candidate PIN, we compare to ADMIN_PIN server-side and respond
 * with success or failure. Failed attempts are rate-limited per-IP to slow
 * brute-force.
 *
 * Out of the box ADMIN_PIN defaults to "160127" so the project runs locally
 * without configuration. In production, set ADMIN_PIN in your host's
 * environment to something unguessable.
 */

const ADMIN_PIN = process.env.ADMIN_PIN || "160127";

// Simple per-IP attempt tracker. In-memory only — resets on server restart,
// which is fine for free-tier hosting that sleeps anyway.
type Attempts = { count: number; lockedUntil: number };
const attempts = new Map<string, Attempts>();
const LOCKOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;

export const authRouter = router({
  checkPin: publicProcedure
    .input(z.object({ pin: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      const ip = (ctx as any)?.ip ?? "unknown";
      const now = Date.now();
      const rec = attempts.get(ip) ?? { count: 0, lockedUntil: 0 };

      if (rec.lockedUntil > now) {
        return {
          ok: false as const,
          locked: true as const,
          retryInMs: rec.lockedUntil - now,
        };
      }

      const match = input.pin === ADMIN_PIN;

      if (match) {
        attempts.delete(ip);
        const token = crypto.randomBytes(32).toString("hex");
        addAdminSession(token);
        return { ok: true as const, token };
      }

      const next: Attempts = {
        count: rec.count + 1,
        lockedUntil: rec.count + 1 >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0,
      };
      attempts.set(ip, next);

      // GC: clear old records every so often
      if (attempts.size > 1000) {
        for (const [k, v] of attempts) {
          if (v.lockedUntil < now - 60_000) attempts.delete(k);
        }
      }

      return {
        ok: false as const,
        locked: next.lockedUntil > 0,
        retryInMs: next.lockedUntil > 0 ? next.lockedUntil - now : 0,
        attemptsLeft: Math.max(0, MAX_ATTEMPTS - next.count),
      };
    }),
});
