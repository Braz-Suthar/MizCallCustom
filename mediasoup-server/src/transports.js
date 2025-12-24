const ANNOUNCED_IP = process.env.MEDIASOUP_ANNOUNCED_IP || null;

export async function createWebRtcTransport(router) {
    return router.createWebRtcTransport({
        listenIps: [{ ip: "0.0.0.0", announcedIp: ANNOUNCED_IP }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
    });
}