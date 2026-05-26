import { initTRPC } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { isAdminToken } from "./adminSession";

export function createContext({ req }: CreateFastifyContextOptions) {
  // Render and most proxies forward the real client IP via x-forwarded-for.
  const forwarded = (req.headers["x-forwarded-for"] as string | undefined) ?? "";
  const ip = forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  const adminToken = req.headers["x-admin-token"] as string | undefined;
  const isAdmin = adminToken ? isAdminToken(adminToken) : false;
  return { ip, isAdmin };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
