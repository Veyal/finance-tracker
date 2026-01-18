# Base stage
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev", "--", "--host"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
# We will mount the nginx config via docker-compose or copy it here.
# For a self-contained image, it's better to copy. 
# However, since I haven't created the nginx config file yet, I'll assume it will be in the context or passed.
# Let's actually keep this simple for now and rely on volume mount for config in the compose file, 
# OR copy a specific config if present. 
# But wait, the user wants 'dockerize', implying the repo should be self-contained.
# I will copy the nginx config in a later step or assume it's picked up.
# Actually, let's just expose port 80/443.
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
