# Not -slim: better-sqlite3 v13 relies on npm's implicit `node-gyp rebuild`,
# which needs Python/make/g++ to configure even though its binding.gyp compiles
# nothing when a prebuilt binary ships with the package. Builder stage only —
# the release stage below is still distroless.
FROM node:24 AS builder

WORKDIR /app

COPY ./src /app/src
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
COPY ./tsconfig.json /app/tsconfig.json
COPY ./esbuild.config.mjs /app/esbuild.config.mjs
COPY ./.npmrc /app/.npmrc

RUN --mount=type=secret,id=NODE_AUTH_TOKEN \
    export NODE_AUTH_TOKEN=$(cat /run/secrets/NODE_AUTH_TOKEN) && npm ci

RUN npm run build
# Copy static files to the build output.
COPY ./src/files /app/dist/files
COPY ./src/clubkid /app/dist/clubkid
COPY ./src/responses /app/dist/responses
RUN mkdir -p /app/logs
RUN mkdir -p /app/data

FROM gcr.io/distroless/nodejs24-debian13:nonroot AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder --chown=65532:65532 /app/logs /app/logs
COPY --from=builder --chown=65532:65532 /app/data /app/data
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/build /app/build

ENV NODE_ENV=production

USER 65532:65532

CMD ["--no-deprecation", "--enable-source-maps", "/app/dist/index.js"]
