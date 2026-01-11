FROM node:18-alpine

WORKDIR /app

# Install dependencies (better caching)
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy application source
COPY migrations ./migrations
COPY src ./src
COPY public ./public

ENV NODE_ENV=production

# Document correct port (optional but correct)
EXPOSE 3100

CMD ["node", "src/index.js"]