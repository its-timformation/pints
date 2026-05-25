# syntax=docker/dockerfile:1.7

# ---------- 1. Build stage ----------
FROM node:20-alpine AS builder

# Build deps for native modules (libsql native bindings)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source and build
COPY . .
RUN yarn build

# Prune to production deps only
RUN yarn install --frozen-lockfile --production && yarn cache clean

# ---------- 2. Runtime stage ----------
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts and trimmed node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/seed.ts ./seed.ts

# Render's default port for web services
EXPOSE 10000
ENV PORT=10000

CMD ["node", "dist/index.js"]
