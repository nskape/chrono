const { RTCClient } = require("webrtc-server-client-datachannel");
const { rtcConfig } = require("./rtc.config");

async function main() {
  try {
    const interval = 1000; // 1 second as a standard interval (10ms will send 100 packets)
    var freq = getFreqValue(); // amount of packets in one interval
    var duration = getDurValue(); // duration of test (x amount of pings * duration = net pings)  -- this adjusts duration this runs in ms

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

    packetID = 0;
    packetSender = setInterval(() => {
      fcheck = 0;
      innerSender = setInterval(() => {
        // JSON packet info
        let packetData = {
          id: packetID,
          startTime: performance.now(),
        };
        pc.udp.send(JSON.stringify(packetData)); // send packet
        packetID++;
        incrementBadge();
        console.log("*-> Sent UDP packet");
        fcheck++;
        if (fcheck >= freq) {
          clearInterval(innerSender);
          //clearInterval(packetSender);
        }
      }, 10);
    }, interval);

    // Receive relay from server (moved oustide setInterval)
    // (BUG: Latency does not work correctly, always larger with later packets
    // - when run without for loop, latency numbers are accurate just change interval.
    // The issue is that in for loop the packets are detected one after other so latency is always
    // increasing as the loop continues).

    pc.udp.onmessage = (event) => {
      packetRelayData = JSON.parse(event.data); // receive and parse packet data from server
      var endDate = performance.now();
      packetRelayData.endTime = endDate; // append end trip time to JSON

      // calculate latency and append to JSON
      packetRelayData.latency = Math.abs(
        packetRelayData.endTime - packetRelayData.startTime
      );
      console.log("* RECEIVED SERVER RELAY | ", packetRelayData);
    };
  } catch (error) {
    console.log(error);
  }

  // Stop sending UDP packets within duration
  // setTimeout(() => { clearInterval(packetSender); alert('stop'); }, duration);
  setTimeout(() => {
    clearInterval(packetSender);
  }, duration * 1000);
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

function getFreqValue() {
  var out = document.getElementById("freqField").value;
  return out;
}
function getDurValue() {
  var out = document.getElementById("durField").value;
  return out;
}

function incrementBadge() {
  var count = document.getElementById("countBadge");
  var number = count.innerHTML;
  number++;
  count.innerHTML = number;
}

// <- Put UI handlers here ->

// Entry point
function runClient() {
  main();
}
