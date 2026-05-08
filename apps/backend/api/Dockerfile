FROM node:24-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nestjs

COPY dist/apps/backend/api/ ./dist/
COPY package.json pnpm-lock.yaml ./

RUN corepack enable pnpm \
    && pnpm install --prod --frozen-lockfile --ignore-scripts \
    && pnpm store prune

USER nestjs

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]
