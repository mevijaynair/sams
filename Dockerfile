# Multi-stage Dockerfile for SAMS
# Stage 1: Dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:24-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create data directory for SQLite (persistent volume mount)
RUN mkdir -p /data

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/health', (r) => { if (r.statusCode !== 200) throw new Error('unhealthy'); })"

EXPOSE 3000
CMD ["node", "server/index.js"]
