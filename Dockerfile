FROM node:20-alpine

RUN apk add --no-cache ffmpeg && \
    npm install -g pm2

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --chown=appuser:appgroup package*.json ./
RUN npm install --include=dev

COPY --chown=appuser:appgroup . .

RUN npx tsc


RUN test -f dist/server.js || (echo "server.js not found in dist" && exit 1)

RUN mkdir -p /opt/data/hls /opt/data/thumbnails /opt/data/keys && \
    chown -R appuser:appgroup /opt/data

USER appuser

EXPOSE 3000

CMD ["pm2-runtime", "dist/server.js"]