const { RTCClient } = require('webrtc-server-client-datachannel');
const { rtcConfig } = require('./rtc.config');
//const WebSocket = require('ws');
 
async function main() {
  try {
    console.log("opening websocket");
    const ws = new WebSocket('ws://' + "localhost" + ':8080');
    await onOpen(ws);
 
    let pc = new RTCClient(ws, rtcConfig.RTCPeerConnectionConf, rtcConfig.datachannels);
    await pc.create();
    
    // Check
    pc.udp.send("AllReadyFromUDP");
    
    // When message received from server
    pc.udp.onmessage = (event)=>{
      console.log("Received UDP packet | Data:", event.data);
    };
    
    // Send UDP packet to server every 5 seconds
    setInterval(() => {
 
        console.log("Attempting to send UDP Packet...");
        pc.udp.send("Hello from client UDP");
        console.log("* Sent UDP packet");
 
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
 
// Listener for bootstrap button
window.onload=function(){
  document.getElementById("startButton").addEventListener ("click", runClient, false);
}
// Entry point
function runClient(){
  main();
};

