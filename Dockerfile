FROM node:24-slim AS builder

WORKDIR /app

COPY ./src /app/src
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
COPY ./tsconfig.json /app/tsconfig.json

RUN --mount=type=cache,target=/root/.npm-production npm ci --ignore-scripts
RUN npm run build
COPY ./src/files /app/dist/files
COPY ./src/clubkid /app/dist/clubkid
COPY ./src/responses /app/dist/responses

# Install dotenvx and run prebuild in the builder (Debian) image so the
# final image doesn't need the installer or apt packages.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl ca-certificates bash \
	&& curl -sfS https://dotenvx.sh/install.sh | bash -s -- --directory=/usr/local/bin \
	&& dotenvx ext prebuild \
	&& rm -rf /var/lib/apt/lists/*

# Install production dependencies in builder and create logs dir so they
# are present in the final minimal image.
RUN npm ci --ignore-scripts --omit=dev && mkdir -p /app/logs

FROM gcr.io/distroless/nodejs24-debian12 AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/logs /app/logs
ENV NODE_ENV=production

CMD ["/app/dist/index.js"]