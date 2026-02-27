# Build stage
FROM node:24-slim AS base

FROM base AS build
RUN npm i -g pnpm
WORKDIR /build
COPY . .
RUN pnpm install
RUN pnpm db:generate
RUN pnpm build

# Production stage
FROM base AS production
WORKDIR /app

# Faqat production uchun kerakli fayllarni nusxalash
COPY --from=build /build/dist ./dist
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/package.json ./package.json
COPY --from=build /build/prisma ./prisma

ARG PORT=3000
ENV NODE_ENV=production
ENV PORT=$PORT

EXPOSE $PORT

# Prisma client productionda ishlashi uchun va serverni ishga tushirish
CMD ["node", "dist/index.js"]
