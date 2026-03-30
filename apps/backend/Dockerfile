# ── Stage 1: deps ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci

# ── Stage 2: build ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/
COPY package*.json ./
RUN cd apps/backend && npx nest build

# ── Stage 3: production deps only ────────────────────────────
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
COPY apps/backend/package*.json ./apps/backend/
RUN npm ci --omit=dev

# ── Stage 4: runner ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY apps/backend/drizzle ./drizzle
COPY apps/backend/package*.json ./
EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
