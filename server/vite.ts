import type { FastifyInstance } from "fastify";
import { createServer as createViteServer } from "vite";
import fs from "node:fs/promises";
import path from "node:path";

export async function setupVite(fastify: FastifyInstance) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server: fastify.server },
      allowedHosts: true,
    },
    appType: "custom",
  });

  // Use Vite's connect middleware via Fastify's raw server
  fastify.addHook("onRequest", async (request, reply) => {
    await new Promise<void>((resolve) => {
      reply.raw.on("close", () => resolve());
      vite.middlewares(request.raw, reply.raw, () => resolve());
    });

    // If Vite already sent the response, tell Fastify not to process further
    if (reply.raw.writableEnded) {
      reply.hijack();
    }
  });

  // SPA fallback: serve index.html for all non-API requests
  fastify.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api")) {
      reply.code(404).send({ error: "Not found" });
      return;
    }

    const htmlPath = path.resolve(process.cwd(), "client/index.html");
    let html = await fs.readFile(htmlPath, "utf-8");
    html = await vite.transformIndexHtml(request.url, html);
    reply.type("text/html").send(html);
  });
}
