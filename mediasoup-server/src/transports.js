export async function createWebRtcTransport(router) {
    return router.createWebRtcTransport({
        listenIps: [{ ip: "0.0.0.0", announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
    });
}