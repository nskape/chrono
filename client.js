const { RTCClient } = require("webrtc-server-client-datachannel");
const { rtcConfig } = require("./rtc.config");
//const WebSocket = require('ws');

async function main() {
  try {
    const interval = 1000; // 1 second as a standard interval
    var duration = 5000; // duration of test (x amount of pings * duration = net pings)  -- this adjusts duration this runs
    var freq = 10; // amount of packets in one interval

    console.log("opening websocket");
    const ws = new WebSocket("ws://" + "localhost" + ":8080");
    await onOpen(ws);

    let pc = new RTCClient(
      ws,
      rtcConfig.RTCPeerConnectionConf,
      rtcConfig.datachannels
    );
    await pc.create();

    // Check
    // pc.udp.send("AllReadyFromUDP");
    // When message received from server
    // pc.udp.onmessage = (event)=>{
    //   console.log("Received UDP packet | Data:", event.data);
    // };

    // Send UDP packet to server within interval
    packetSender = setInterval(() => {
      pc.udp.send("Hello from client UDP"); // send packet
      for (var i = 0; i < freq; i++) {
        console.log("* Sent UDP packet");
      }
    }, interval);
  } catch (error) {
    console.log(error);
  }

  // Stop sending UDP packets within duration
  // setTimeout(() => { clearInterval(packetSender); alert('stop'); }, duration);
  setTimeout(() => {
    clearInterval(packetSender);
  }, duration);
}

async function onOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onclose = () => reject(new Error("WebSocket closed"));
  });
}

// Listener for bootstrap button
window.onload = function () {
  document
    .getElementById("startButton")
    .addEventListener("click", runClient, false);
};

// UI for Testing

// <- Put UI handlers here ->

// Entry point
function runClient() {
  main();
}
