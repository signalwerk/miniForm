FROM node:20-alpine AS editor-builder

WORKDIR /app/editor

COPY editor/package.json editor/package-lock.json* ./
RUN npm ci

COPY editor ./

ARG VITE_POCKETBASE_URL=http://localhost:8090
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL

RUN npm run build

FROM node:20-alpine AS viewer-builder

WORKDIR /app/viewer

COPY viewer/package.json viewer/package-lock.json* ./
RUN npm ci

COPY viewer ./

RUN npm run build

FROM nginx:1.27-alpine

COPY infra/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY --from=editor-builder /app/editor/dist /usr/share/nginx/html/editor
COPY --from=viewer-builder /app/viewer/dist /usr/share/nginx/html/viewer

EXPOSE 80
