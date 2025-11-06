FROM node:24-alpine AS builder

WORKDIR /app

COPY . /app

RUN --mount=type=cache,target=/root/.npm-production npm ci --ignore-scripts
RUN npm run build
COPY ./src/files /app/dist/files
COPY ./src/clubkid /app/dist/clubkid
COPY ./src/responses /app/dist/responses

FROM node:24-alpine AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json
RUN mkdir -p /app/logs
ENV NODE_ENV=production
RUN npm ci --ignore-scripts --omit=dev

ENTRYPOINT ["node", "/app/dist/index.js"]