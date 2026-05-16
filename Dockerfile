FROM node:20-alpine


RUN apk add --no-cache ffmpeg


RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app


COPY package*.json ./


RUN npm install --include=dev


COPY . .


RUN npx tsc

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 3000

# Run compiled JS in production
CMD ["node", "dist/server.js"]