FROM node:18

WORKDIR /app

COPY package.json .
RUN npm install

COPY migrations ./migrations
COPY src ./src

EXPOSE 3000
CMD ["node", "src/index.js"]
