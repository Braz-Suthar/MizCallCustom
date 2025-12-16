FROM node:18

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app
COPY package.json .
RUN npm install
COPY src ./src

CMD ["node", "src/index.js"]
