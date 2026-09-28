# ==========================================
# Stage 1: Build
# ==========================================
FROM node:26-alpine3.23 AS build

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json drizzle.config.ts ./

# Install all dependencies
RUN npm ci

# Copy application source
COPY . .

# Compile TypeScript
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev


# ==========================================
# Stage 2: Production runtime
# ==========================================
FROM node:26-alpine3.23 AS runtime

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy required runtime files from build stage
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

# Run as non-root user
USER node

# Document application port
EXPOSE 3000

# Start compiled application
CMD ["node", "dist/server.js"]