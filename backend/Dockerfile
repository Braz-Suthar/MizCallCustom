FROM node:18-alpine

WORKDIR /app

# Install PostgreSQL client for backups
RUN apk add --no-cache postgresql-client

# Install dependencies (better caching)
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy application source
COPY migrations ./migrations
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# Make backup script executable
RUN chmod +x /app/scripts/backup-database.sh

ENV NODE_ENV=production

# Document correct port (optional but correct)
EXPOSE 3100

CMD ["node", "src/index.js"]