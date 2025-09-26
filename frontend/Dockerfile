# Use a more specific Node.js version for better caching
FROM node:20-alpine AS base

# Install security updates and wget
RUN apk add --no-cache wget ca-certificates && update-ca-certificates

# Create app directory with correct permissions
WORKDIR /app

# Accept build arg for cache busting
ARG BUILD_ID
ENV BUILD_ID=$BUILD_ID
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files first for better layer caching
FROM base AS deps
COPY package*.json ./
RUN npm install --only=production --no-audit --no-fund && npm cache clean --force

# Development dependencies stage
FROM base AS dev-deps
COPY package*.json ./
RUN npm install --no-audit --no-fund && npm cache clean --force

# Build stage
FROM dev-deps AS builder
WORKDIR /app

# Copy source code
COPY . .

# Build with optimized settings (remove turbopack for production)
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000
ENV PORT=3000

# Use standalone build for better performance
CMD ["node", "server.js"]
