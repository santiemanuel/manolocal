# syntax=docker/dockerfile:1

FROM node:22-slim AS frontend-builder

WORKDIR /usr/src/app/frontend

ARG VITE_DIRECTUS_URL=""
ENV VITE_DIRECTUS_URL=${VITE_DIRECTUS_URL}

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM node:22-slim AS backend-deps

WORKDIR /usr/src/app/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-slim AS final

ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3030 \
    DATABASE_URL=./data/app.db \
    UPLOADS_DIR=./uploads \
    FRONTEND_DIST_DIR=./public

WORKDIR /usr/src/app/backend

COPY --from=backend-deps /usr/src/app/backend/node_modules ./node_modules
COPY backend/ ./
COPY --from=frontend-builder /usr/src/app/frontend/dist ./public

EXPOSE 3030

CMD ["node", "--import", "tsx", "src/api/server.ts"]
