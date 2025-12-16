import mediasoup from "mediasoup";

export async function createWorker() {
    return mediasoup.createWorker({
        rtcMinPort: Number(process.env.MEDIASOUP_RTC_MIN_PORT),
        rtcMaxPort: Number(process.env.MEDIASOUP_RTC_MAX_PORT),
        logLevel: "warn"
    });
}