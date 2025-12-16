import { RingBuffer } from "./ringBuffer.js";
import { writeWav } from "./ffmpeg.js";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const buffers = new Map(); // userId → RingBuffer

export function onAudioFrame(userId, samples) {
  if (!buffers.has(userId)) {
    buffers.set(userId, new RingBuffer(5));
  }
  buffers.get(userId).push(samples);
}

export function startClip(hostId, userId) {
  const preAudio = buffers.get(userId)?.snapshot() || [];
  return { clipId: randomUUID(), preAudio };
}

export function endClip(hostId, userId, clip) {
  const date = new Date();
  const day = date.toISOString().slice(0, 10);
  const time = date.toISOString().slice(11, 19).replace(/:/g, "-");

  const dir = `/var/app/recordings/${hostId}/${userId}/${day}`;
  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, `clip_${time}.wav`);
  writeWav(clip.preAudio, file);

  return file;
}
