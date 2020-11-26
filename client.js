const { RTCClient } = require('webrtc-server-client-datachannel');
const { rtcConfig } = require('./rtc.config');
const WebSocket = require('ws');
 
async function main() {
  try {
    console.log("opening websocket");
    const ws = new WebSocket('ws://' + "localhost" + ':8080');
    await onOpen(ws);
 
    let pc = new RTCClient(ws, rtcConfig.RTCPeerConnectionConf, rtcConfig.datachannels);
    await pc.create();
 
    pc.tcp.send("AllReadyFromTCP");
    pc.udp.send("AllReadyFromUDP");
 
    pc.tcp.onmessage = (event)=>{
      console.log("got 'tcp'.", event.data);
    };
 
    pc.udp.onmessage = (event)=>{
      console.log("got 'udp'.", event.data);
    };
 
    setInterval(() => {
        console.log("trying to send hello from tcp");
        pc.tcp.send("Hello from client TCP");
 
        console.log("trying to send hello from UDP");
        pc.udp.send("Hello from client UDP");
 
    }, 5000);
  } catch (error) {
    console.log(error);
  }
}
 
async function onOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onclose = () => reject(new Error('WebSocket closed'));
  });
}
 
main();