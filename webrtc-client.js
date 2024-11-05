/**
 * webrtc-client.js
 * Runs a WebRTC client that handles WebSocket connections, sends and receives data, measures latency, and updates the user interface accordingly.
 */

async function onOpen(ws) {
    return new Promise((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onclose = () => reject(new Error("WebSocket closed"));
    });
}
module.exports = { onOpen };

