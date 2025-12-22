export class Peer {
    constructor({ id, socket, role, hostId = null }) {
        this.id = id;
        this.socket = socket;
        this.role = role;
        this.hostId = hostId;

        this.sendTransport = null;
        this.recvTransport = null;

        this.producer = null;
        this.consumers = new Map();
    }
}