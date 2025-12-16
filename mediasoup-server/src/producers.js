export async function createProducer(transport, rtpParameters) {
    return transport.produce({
        kind: "audio",
        rtpParameters
    });
}