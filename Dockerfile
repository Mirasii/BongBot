FROM node:24-slim AS builder

WORKDIR /app

COPY ./src /app/src
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
COPY ./tsconfig.json /app/tsconfig.json

RUN --mount=type=cache,target=/root/.npm-production npm ci --ignore-scripts
RUN npm run build
# Copy static files to the build output.
COPY ./src/files /app/dist/files
COPY ./src/clubkid /app/dist/clubkid
COPY ./src/responses /app/dist/responses
RUN mkdir -p /app/logs

FROM gcr.io/distroless/nodejs24-debian12 AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/logs /app/logs
ENV NODE_ENV=production

CMD ["--no-deprecation", "/app/dist/index.js"]