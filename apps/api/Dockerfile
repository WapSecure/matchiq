# Build from the repository root: docker build -f apps/api/Dockerfile -t matchiq-api .
ARG NODE_IMAGE=node:22.22.3-bookworm-slim@sha256:e21fc383b50d5347dc7a9f1cae45b8f4e2f0d39f7ade28e4eef7d2934522b752

FROM ${NODE_IMAGE} AS build
ENV CI=true NX_DAEMON=false NX_NO_CLOUD=true COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --offline
# prune emits dist/main.js with a pruned package.json and lockfile for a production install.
RUN pnpm nx run api:prune --skip-nx-cache
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    cd apps/api/dist && pnpm install --frozen-lockfile --prod

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production API_PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/api/dist/ ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.API_PORT+'/api/v1/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "--enable-source-maps", "main.js"]
