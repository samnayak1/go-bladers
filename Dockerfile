FROM node:20-alpine

RUN apk add --no-cache ffmpeg

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --chown=appuser:appgroup package*.json ./
RUN npm install --include=dev

COPY --chown=appuser:appgroup . .

RUN npx tsc --listEmittedFiles || (echo "TypeScript compilation failed" && exit 1)


RUN mkdir -p /opt/data/hls /opt/data/thumbnails /opt/data/keys && \
    chown -R appuser:appgroup /opt/data

USER appuser

EXPOSE 3000

CMD ["node", "dist/server.js"]