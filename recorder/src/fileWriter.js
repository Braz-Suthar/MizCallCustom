import { spawn } from "child_process";

export function writeWav(pcm, filePath) {
    const ffmpeg = spawn("ffmpeg", [
        "-f", "s16le",
        "-ar", "48000",
        "-ac", "2",
        "-i", "pipe:0",
        filePath
    ]);

    ffmpeg.stdin.write(pcm);
    ffmpeg.stdin.end();
}