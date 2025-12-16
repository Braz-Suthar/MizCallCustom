import { RingBuffer } from "./ringBuffer.js";
import { writeWav } from "./fileWriter.js";
import fs from "fs";
import path from "path";

export class ClipController {
    constructor({ hostId, userId }) {
        this.hostId = hostId;
        this.userId = userId;
        this.buffer = new RingBuffer(5);
        this.recording = false;
        this.frames = [];
    }

    onPcm(pcm) {
        this.buffer.push(pcm);
        if (this.recording) this.frames.push(pcm);
    }

    start() {
        this.recording = true;
        this.frames = [...this.buffer.snapshot()];
        this.startedAt = new Date();
    }

    stop() {
        this.recording = false;
        this.endedAt = new Date();
        this.write();
    }

    write() {
        const date = this.startedAt.toISOString().slice(0, 10);
        const time = this.startedAt.toISOString().slice(11, 19).replace(/:/g, "-");

        const dir = `/var/app/recordings/${this.hostId}/${this.userId}/${date}`;
        fs.mkdirSync(dir, { recursive: true });

        const file = path.join(dir, `clip_${time}.wav`);
        writeWav(Buffer.concat(this.frames), file);

        // metadata
        fs.writeFileSync(
            file.replace(".wav", ".json"),
            JSON.stringify({
                hostId: this.hostId,
                userId: this.userId,
                startedAt: this.startedAt,
                endedAt: this.endedAt
            }, null, 2)
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
    }
}