import { spawn } from "child_process";

export class RtpStream {
    constructor({ port, onPcm, label = "stream" }) {
        this.closed = false;
        this.packets = 0;
        this.bytes = 0;
        this.label = label;
        this.port = port;

        const sdp = [
            "v=0",
            "o=- 0 0 IN IP4 0.0.0.0",
            "s=recorder",
            "c=IN IP4 0.0.0.0",
            "t=0 0",
            `m=audio ${port} RTP 100`,
            "a=rtpmap:100 opus/48000/2",
            "a=recvonly",
        ].join("\n");

        this.ffmpeg = spawn("ffmpeg", [
            "-loglevel", "error",
            "-protocol_whitelist", "file,udp,rtp",
            "-f", "sdp",
            "-i", "pipe:0",
            "-f", "s16le",
            "-ar", "48000",
            "-ac", "2",
            "pipe:1"
        ]);

        this.ffmpeg.stdin.write(sdp);
        this.ffmpeg.stdin.end();

        this.ffmpeg.stdout.on("data", (chunk) => {
            this.packets += 1;
            this.bytes += chunk.length;
            onPcm(chunk);
        });
        this.ffmpeg.on("error", (err) => {
            console.error("[recorder] ffmpeg error", err?.message || err);
            this.closed = true;
        });
        this.ffmpeg.on("close", () => {
            this.closed = true;
        });
        this.ffmpeg.stderr.on("data", (data) => {
            const msg = data.toString().trim();
            if (msg) console.error("[recorder] ffmpeg stderr", msg);
        });
    }

    close() {
        this.closed = true;
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
        console.log("[recorder] stream closed", this.label, { packets: this.packets, bytes: this.bytes });
    }
}