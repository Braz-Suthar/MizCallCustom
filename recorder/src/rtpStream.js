import dgram from "dgram";
import { spawn } from "child_process";

export class RtpStream {
    constructor({ port, onPcm }) {
        this.socket = dgram.createSocket("udp4");

        this.ffmpeg = spawn("ffmpeg", [
            "-loglevel", "quiet",
            "-protocol_whitelist", "file,udp,rtp",
            "-f", "opus",
            "-i", "pipe:0",
            "-f", "s16le",
            "-ar", "48000",
            "-ac", "2",
            "pipe:1"
        ]);

        this.ffmpeg.stdout.on("data", onPcm);

        this.socket.on("message", (packet) => {
            // Strip RTP header (12 bytes)
            this.ffmpeg.stdin.write(packet.slice(12));
        });

        this.socket.bind(port);
    }

    close() {
        this.socket.close();
        this.ffmpeg.stdin.end();
        this.ffmpeg.kill("SIGTERM");
    }
}