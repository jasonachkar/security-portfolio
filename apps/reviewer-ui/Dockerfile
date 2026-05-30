FROM node:20-alpine AS build

WORKDIR /workspace/apps/reviewer-ui
COPY apps/reviewer-ui/package*.json ./
RUN npm ci
COPY apps/reviewer-ui ./
COPY scripts /workspace/scripts
COPY evidence /workspace/evidence
COPY apps/gateway/test /workspace/apps/gateway/test
COPY apps/vulnerability-scanner/tests /workspace/apps/vulnerability-scanner/tests
COPY apps/network-analyzer/tests /workspace/apps/network-analyzer/tests
COPY apps/assessment-orchestrator/tests /workspace/apps/assessment-orchestrator/tests
COPY infra/local/docker-compose.yml /workspace/infra/local/docker-compose.yml
COPY infra/azure/terraform/environments/dev/main.tf /workspace/infra/azure/terraform/environments/dev/main.tf
RUN npm run build

FROM nginx:1.27-alpine
COPY apps/reviewer-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/reviewer-ui/dist /usr/share/nginx/html
EXPOSE 80
