# ==========================================
# Stage 1: Build the application
# ==========================================
# Use Node.js 26 on Alpine Linux as the build environment.
FROM node:26-alpine3.23 AS build

# Set the working directory inside the image.
WORKDIR /app

# Copy dependency manifests and Drizzle configuration first.
# This allows Docker to cache the dependency installation layer.
COPY package.json package-lock.json drizzle.config.ts ./

# Install dependencies exactly as recorded in package-lock.json.
RUN npm ci

# Copy the remaining application files into the build stage.
COPY . .

# Compile the TypeScript application into JavaScript.
RUN npm run build


# ==========================================
# Stage 2: Production runtime
# ==========================================
# Start a clean image with the same Node.js version.
FROM node:26-alpine3.23 AS runtime

# Set the application's working directory.
WORKDIR /app

# Set the application environment to production.
ENV NODE_ENV=production

# Copy the package manifest from the build stage.
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/package-lock.json ./

# Copy the compiled JavaScript application.
COPY --from=build --chown=node:node /app/dist ./dist

# Copy dependencies and prune development packages in the runtime image.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
RUN npm prune --omit=dev

# Run as non-root user
USER node

# Document the port the application listens on.
EXPOSE 3000

# Start the compiled Express application when the container runs.
CMD ["node", "dist/index.js"]