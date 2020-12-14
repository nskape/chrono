const { RTCServer } = require("webrtc-server-client-datachannel");
const { createServer } = require("http");
const { Server } = require("ws");
const express = require("express");

const { rtcConfig } = require("./rtc.config");

const app = express();
const server = createServer(app);

// Server listening on 8080
server.listen(8080, () => {
  const address = server.address();
  console.log(`Server running at ${address.port}`);
});

new Server({ server }).on("connection", async (ws) => {
  // Creates RTC endpoint and initiates ws handshake
  // This is running code from wrtc that has been abstracted to simplify the process
  let pc = new RTCServer(
    ws,
    rtcConfig.RTCPeerConnectionConf,
    rtcConfig.datachannels
  );
  await pc.create();

  packetsReceived = 0; // for testing

  pc.udp.onmessage = (event) => {
    packetsReceived++;
    packetRelayData = event.data;
    // print statements generate lag
    //console.log(`* RECEIVED UDP | ${packetRelayData}`);
    //console.log(packetsReceived);
    pc.udp.send(packetRelayData); //send relay packet
  };
});
