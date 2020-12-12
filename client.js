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

    // ############## Generate and send code #############
    // let packetData = {
    //   id: packetID,
    //   startTime: performance.now(),
    // };
    // pc.udp.send(JSON.stringify(packetData)); // send packet
    // packetID++;
    // incrementBadge();
    // console.log("*-> Sent UDP packet");
    // ###################################################

    // Send UDP packet to server within interval

    packetID = 0; // ID of each packet
    var counter1 = 0; // outer loop
    var counter2 = 0; // inner loop
    var dur_count = 1; // count at 1 because function runs once at first

    (function timeout1() {
      var i = 0;
      console.log("*-> Sent UDP packet");
      (function timeout2() {
        ++i;
        // ################################################### PACKET LOGIC
        let packetData = {
          id: packetID,
          startTime: performance.now(),
        };
        pc.udp.send(JSON.stringify(packetData)); // send packet
        packetID++;
        incrementBadge();
        // ###################################################
        if (i < freq) {
          setTimeout(timeout2, 3);
        }
      })();

      if (dur_count < duration) {
        dur_count++;
        setTimeout(timeout1, interval);
      }
    })();

    // Stop sending UDP packets within duration
    // setTimeout(() => { clearInterval(packetSender); alert('stop'); }, duration);

    // Right now calls the meme every 3 seconds

    // Receive relay from server (moved oustide setInterval)
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
}

// #################### END MAIN ####################

// <- WS Promise ->

async function onOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onclose = () => reject(new Error("WebSocket closed"));
  });
}

// <- Put UI handlers here ->

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
