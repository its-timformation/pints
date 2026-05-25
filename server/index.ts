import "dotenv/config";
import Fastify from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import fastifyMultipart from "@fastify/multipart";
import { appRouter } from "./routes";
import { createContext } from "./trpc";
import { uploadFile } from "./upload";

const fastify = Fastify({ trustProxy: true });

await fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

await fastify.register(fastifyTRPCPlugin, {
  prefix: "/api/trpc",
  trpcOptions: { router: appRouter, createContext },
});

// Simple health endpoint for Fly / Railway / uptime monitors
fastify.get("/healthz", async () => ({ status: "ok", ts: Date.now() }));

fastify.post("/api/upload", async (request, reply) => {
  const data = await request.file();
  if (!data) {
    return reply.status(400).send({ error: "No file uploaded" });
  }

  const buffer = await data.toBuffer();
  try {
    const result = await uploadFile(buffer, data.filename, data.mimetype);
    return result;
  } catch (err: any) {
    fastify.log.error(err);
    return reply.status(500).send({ error: "Upload failed: " + err.message });
  }
});

if (process.env.NODE_ENV === "development") {
  const { setupVite } = await import("./vite");
  await setupVite(fastify);
} else {
  const { serveStatic } = await import("./static");
  await serveStatic(fastify);
}

const port = parseInt(process.env.PORT || "5173");
await fastify.listen({ port, host: "0.0.0.0" });
console.log(`Server listening on port ${port}`);
