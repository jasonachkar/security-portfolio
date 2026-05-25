FROM node:20-alpine AS build

WORKDIR /app
COPY apps/gateway/package*.json ./
RUN npm ci
COPY apps/gateway/tsconfig.json ./tsconfig.json
COPY apps/gateway/src ./src
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY apps/gateway/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
