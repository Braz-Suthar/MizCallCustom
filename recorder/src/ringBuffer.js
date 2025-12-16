export class RingBuffer {
  constructor(seconds, sampleRate = 48000) {
    this.maxSamples = seconds * sampleRate;
    this.buffer = [];
  }

  push(samples) {
    this.buffer.push(...samples);
    if (this.buffer.length > this.maxSamples) {
      this.buffer.splice(0, this.buffer.length - this.maxSamples);
    }
  }

  snapshot() {
    return [...this.buffer];
  }

  clear() {
    this.buffer = [];
  }
}
