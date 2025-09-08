FROM node:22.12-alpine AS builder

WORKDIR /app

COPY . /app

RUN --mount=type=cache,target=/root/.npm npm install

RUN --mount=type=cache,target=/root/.npm-production npm ci --ignore-scripts --omit-dev


FROM node:22-alpine AS release

WORKDIR /app

COPY --from=builder /app/src /app/src
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json
RUN mkdir -p /app/logs
ENV NODE_ENV=production
RUN npm ci --ignore-scripts --omit-dev

ENTRYPOINT ["node", "/app/src/index.js"]