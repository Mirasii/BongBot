FROM node:24-slim AS builder

WORKDIR /app

COPY ./src /app/src
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
COPY ./tsconfig.json /app/tsconfig.json
COPY ./esbuild.config.mjs /app/esbuild.config.mjs

RUN --mount=type=cache,target=/root/.npm-production npm ci
RUN npm run build
# Copy static files to the build output.
COPY ./src/files /app/dist/files
COPY ./src/clubkid /app/dist/clubkid
COPY ./src/responses /app/dist/responses
RUN mkdir -p /app/logs
RUN mkdir -p /app/data

FROM gcr.io/distroless/nodejs24-debian12 AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/logs /app/logs
COPY --from=builder /app/data /app/data
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules/better-sqlite3/build/Release/better_sqlite3.node /app/build/Release/better_sqlite3.node

ENV NODE_ENV=production

CMD ["--no-deprecation", "/app/dist/index.js"]