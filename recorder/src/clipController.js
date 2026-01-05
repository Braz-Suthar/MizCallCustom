import { RingBuffer } from "./ringBuffer.js";
import { writeWav } from "./fileWriter.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export class ClipController {
    constructor({
        hostId,
        userId,
        meetingId,
        userPreSeconds = 2,
        hostPreSeconds = 5,
        userPostSeconds = 2,
        hostPostSeconds = 5
    }) {
        this.hostId = hostId;
        this.userId = userId;
        this.meetingId = meetingId;

        this.userPreSeconds = userPreSeconds;
        this.hostPreSeconds = hostPreSeconds;
        this.userPostSeconds = userPostSeconds;
        this.hostPostSeconds = hostPostSeconds;

        this.userBuffer = new RingBuffer(userPreSeconds);
        this.hostBuffer = new RingBuffer(hostPreSeconds);

        this.userFrames = [];
        this.hostFrames = [];
        this.recording = false;
        this.stopTimeout = null;
        this.sequence = 0;
        this.finalized = false;
    }

    onUserPcm(pcm) {
        this.userBuffer.push(pcm);
        if (this.recording) this.userFrames.push(pcm);
    }

    onHostPcm(pcm) {
        this.hostBuffer.push(pcm);
        if (this.recording) this.hostFrames.push(pcm);
    }

    start() {
        this.recording = true;
        this.finalized = false;
        this.startedAt = new Date();
        this.sequence += 1;
        // seed frames with pre-roll snapshots
        this.userFrames = [Buffer.from(this.userBuffer.snapshot())];
        this.hostFrames = [Buffer.from(this.hostBuffer.snapshot())];
    }

    stop() {
        if (this.finalized) return;
        // keep recording for post-roll before finalizing
        const postMs = Math.max(this.userPostSeconds, this.hostPostSeconds) * 1000;
        if (this.stopTimeout) clearTimeout(this.stopTimeout);
        this.stopTimeout = setTimeout(() => {
            this.recording = false;
            this.endedAt = new Date();
            this.write();
        }, postMs);
    }

    write() {
        if (this.finalized) return;
        const date = this.startedAt.toISOString().slice(0, 10);
        const time = this.startedAt.toISOString().slice(11, 19).replace(/:/g, "-");

        const dir = `/var/app/recordings/${this.hostId}/${this.userId}/${date}`;
        fs.mkdirSync(dir, { recursive: true });

        const fileBase = path.join(dir, `clip_${time}_${this.sequence}`);
        const file = `${fileBase}.wav`;

        const mixed = mixPcm(Buffer.concat(this.hostFrames), Buffer.concat(this.userFrames));
        console.log("[recorder] write clip", { file, hostLen: mixed.length, userFrames: this.userFrames.length, hostFrames: this.hostFrames.length });
        writeWav(mixed, file);

        // metadata
        fs.writeFileSync(
            file.replace(".wav", ".json"),
            JSON.stringify(
                {
                    hostId: this.hostId,
                    userId: this.userId,
                    meetingId: this.meetingId,
                    startedAt: this.startedAt,
                    endedAt: this.endedAt
                },
                null,
                2
            )
        );

        this.onFinalized?.({
            id: crypto.randomUUID(),
            hostId: this.hostId,
            userId: this.userId,
            meetingId: this.meetingId,
            startedAt: this.startedAt,
            endedAt: this.endedAt,
            filePath: file
        });

        this.finalized = true;
        this.userFrames = [];
        this.hostFrames = [];
        this.userBuffer.clear();
        this.hostBuffer.clear();
    }
}

function mixPcm(hostBuf, userBuf) {
    // Mix two s16le streams to mono; clamp to int16 range
    const len = Math.max(hostBuf.length, userBuf.length);
    const out = Buffer.alloc(len);
    for (let i = 0; i < len; i += 2) {
        const h = hostBuf.length >= i + 2 ? hostBuf.readInt16LE(i) : 0;
        const u = userBuf.length >= i + 2 ? userBuf.readInt16LE(i) : 0;
        let mixed = h + u;
        if (mixed > 32767) mixed = 32767;
        if (mixed < -32768) mixed = -32768;
        out.writeInt16LE(mixed, i);
    }
    return out;
}