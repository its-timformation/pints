import type { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";

export async function serveStatic(fastify: FastifyInstance) {
  const distPath = path.resolve(process.cwd(), "dist/public");

  await fastify.register(fastifyStatic, {
    root: distPath,
    prefix: "/",
  });

  // SPA fallback
  fastify.setNotFoundHandler(async (_request, reply) => {
    return reply.sendFile("index.html");
  });
}
