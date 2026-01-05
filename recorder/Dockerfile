FROM node:18

# ffmpeg + extra codecs (opus demux/decoding)
RUN apt-get update && apt-get install -y ffmpeg libavcodec-extra

WORKDIR /app
COPY package.json .
RUN npm install
COPY src ./src

CMD ["node", "src/index.js"]
