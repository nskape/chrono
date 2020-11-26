const { RTCServer } = require('webrtc-server-client-datachannel');
const { createServer } = require('http');
const { Server } = require('ws');
const express = require('express');
 
const { rtcConfig } = require('./rtc.config');
 
const app = express();
const server = createServer(app);
 
 
server.listen(8080, () => {
  const address = server.address();
  console.log(`Server running at ${address.port}`);
});
 
new Server({ server }).on('connection', async ws => {
 
  let pc = new RTCServer(ws, rtcConfig.RTCPeerConnectionConf, rtcConfig.datachannels);
  await pc.create();
 
  pc.tcp.onmessage = (event) => {
    console.log(`got 'tcp'. ${event.data}`);
  };
  pc.udp.onmessage = (event) => {
    console.log(`got 'udp'. ${event.data}`);
  };
});