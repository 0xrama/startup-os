FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN BETTER_AUTH_SECRET=build-only-placeholder-not-a-runtime-secret pnpm build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
