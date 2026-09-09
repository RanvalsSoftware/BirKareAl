FROM node:22-alpine AS base
WORKDIR /srv/app
RUN apk add --no-cache libc6-compat openssl \
  && corepack enable \
  && corepack prepare pnpm@10.18.0 --activate

FROM base AS build
RUN apk add --no-cache python3 make g++
# Explicit server-only allowlist: never COPY the workspace root or a real .env.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages ./packages
# tsx and Prisma CLI are runtime tools in this source-based workspace.
RUN pnpm --filter @birkare/api... --filter @birkare/worker... install --frozen-lockfile
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/worker/src ./apps/worker/src
COPY apps/worker/tsconfig.json ./apps/worker/tsconfig.json
COPY infra/docker/worker-healthcheck.mjs ./infra/docker/worker-healthcheck.mjs
RUN pnpm --filter @birkare/database prisma:generate

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /srv/app /srv/app
RUN mkdir -p /srv/app/.local-storage && chown node:node /srv/app/.local-storage
USER node
WORKDIR /srv/app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e 'fetch(`http://127.0.0.1:${process.env.API_PORT || 4000}/ready`, {signal: AbortSignal.timeout(8000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))'
CMD ["node", "--import", "tsx", "src/server.ts"]
