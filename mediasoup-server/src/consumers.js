export async function createConsumer(
    transport,
    producer,
    rtpCapabilities
) {
    if (!transport.router.canConsume({
        producerId: producer.id,
        rtpCapabilities
    })) return null;

    return transport.consume({
        producerId: producer.id,
        rtpCapabilities,
        paused: false
    });
}