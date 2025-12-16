import WebSocket from "ws";

let backendSocket = null;

/**
 * Recorder acts as WS SERVER for control,
 * but also as WS CLIENT to backend for events.
 * For now we reuse the same connection pattern.
 */

export function attachBackendSocket(socket) {
  backendSocket = socket;
}

export function sendToBackend(message) {
  if (!backendSocket || backendSocket.readyState !== WebSocket.OPEN) {
    console.warn("Backend WS not connected, cannot send message");
    return;
  }

  backendSocket.send(JSON.stringify(message));
}
