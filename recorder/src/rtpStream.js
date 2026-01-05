import dgram from "dgram";
import { spawn } from "child_process";

export class RtpStream {
    constructor({ port, onPcm }) {
        this.socket = dgram.createSocket("udp4");
        this.closed = false;

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
        this.ffmpeg.on("error", (err) => {
            console.error("[recorder] ffmpeg error", err?.message || err);
            this.closed = true;
        });
        this.ffmpeg.on("close", () => {
            this.closed = true;
        });

        this.onMessage = (packet) => {
            if (this.closed || this.ffmpeg.stdin.destroyed) return;
            try {
                // Strip RTP header (12 bytes)
                this.ffmpeg.stdin.write(packet.slice(12));
            } catch (err) {
                console.error("[recorder] ffmpeg stdin write error", err?.message || err);
                this.closed = true;
            }
        };

        this.socket.on("message", this.onMessage);
        this.socket.on("error", (err) => {
            console.error("[recorder] udp error", err?.message || err);
        });

        this.socket.bind(port, () => {
            this.port = this.socket.address().port;
        });
    }

    close() {
        this.closed = true;
        try {
            this.socket.off("message", this.onMessage);
            this.socket.close();
        } catch {
            // ignore
        }
        try {
            this.ffmpeg.stdin.end();
        } catch {
            // ignore
        }
        try {
            this.ffmpeg.kill("SIGTERM");
        } catch {
            // ignore
        }
    }
}