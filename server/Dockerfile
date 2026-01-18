FROM node:20-slim

# Install dependencies required for building native modules (better-sqlite3)
# python3, make, g++ are often needed for node-gyp
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
