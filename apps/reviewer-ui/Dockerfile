FROM node:20-alpine AS build

WORKDIR /app
COPY apps/reviewer-ui/package*.json ./
RUN npm ci
COPY apps/reviewer-ui ./
RUN npm run build

FROM nginx:1.27-alpine
COPY apps/reviewer-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
