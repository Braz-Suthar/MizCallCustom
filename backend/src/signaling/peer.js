export class Peer {
    constructor({ id, socket, role }) {
        this.id = id;
        this.socket = socket;
        this.role = role;

        this.sendTransport = null;
        this.recvTransport = null;

        this.producer = null;
        this.consumers = new Map();
    }
}