import { spawn } from "child_process";

export function writeWav(samples, filePath) {
  const ffmpeg = spawn("ffmpeg", [
    "-f", "s16le",
    "-ar", "48000",
    "-ac", "2",
    "-i", "pipe:0",
    filePath
  ]);

  ffmpeg.stdin.write(Buffer.from(samples));
  ffmpeg.stdin.end();
}
