FROM node:20-slim

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Build frontend and server
RUN npm run build
RUN npm run build:server

EXPOSE 3001

ENV NODE_ENV=production
ENV SERVER_PORT=3001
ENV APPDATA_DIR=/app/data

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

CMD ["node", "dist-server/server.cjs"]
