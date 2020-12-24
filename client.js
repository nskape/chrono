const { RTCClient } = require("webrtc-server-client-datachannel");
const { rtcConfig } = require("./rtc.config");

var latencyValues = []; // global array for now

async function main() {
  try {
    const interval = 1000; // 1 second as a standard interval (10ms will send 100 packets)
    var freq = getFreqValue(); // amount of packets in one interval
    var duration = getDurValue(); // duration of test (x amount of pings * duration = net pings)  -- this adjusts duration this runs in ms
    var netPackets = freq * duration - 1; // -1 to count 0
    var numRecPackets = 0;
    latencyValues = [];

    console.log("opening websocket");
    const ws = new WebSocket("ws://" + "localhost" + ":8080");
    await onOpen(ws);

    let pc = new RTCClient(
      ws,
      rtcConfig.RTCPeerConnectionConf,
      rtcConfig.datachannels
    );
    await pc.create();

    // Send UDP packet to server within interval

    packetID = 0; // ID of each packet
    var secondCounter = 1; // count at 1 because function runs once at first

    (function outerSender() {
      var freqCounter = 0;
      console.log("*---> SENT UDP PACKETS");
      (function innerSender() {
        freqCounter++;
        let packetData = {
          id: packetID,
          startTime: performance.now(),
        };
        pc.udp.send(JSON.stringify(packetData)); // send packet
        packetID++;
        incrementBadge();
        if (freqCounter < freq) {
          setTimeout(innerSender, 1);
        }
      })();

      //console.log(`secondCounter: ${secondCounter}`);
      //console.log(`duration: ${duration}`);

      if (secondCounter < duration) {
        secondCounter++;
        setTimeout(outerSender, interval);
      }
    })();

    // Receive relay from server
    pc.udp.onmessage = (event) => {
      // catch and close when all expected packets are received (TODO: improve with timeout)
      if (numRecPackets === netPackets) {
        ws.close();
      }
      //console.log(`numRecPackets: ${numRecPackets} | ** ${netPackets}`);
      numRecPackets++;
      incrementBadge2();
      packetRelayData = JSON.parse(event.data); // receive and parse packet data from server
      var endDate = performance.now();
      packetRelayData.endTime = endDate; // append end trip time to JSON

      // calculate latency and append to JSON
      packetRelayData.latency = Math.round(
        Math.abs(packetRelayData.endTime - packetRelayData.startTime)
      );
      latencyValues.push(packetRelayData.latency);
      console.log("* RECEIVED SERVER RELAY | ", packetRelayData);
    };

    // On WS close
    ws.onclose = function (event) {
      latencyCalc();
      console.log("ws closed");
    };
  } catch (error) {
    console.log(error);
  }
}

// #################### END MAIN ####################

// <- Latency calc ->

function latencyCalc() {
  arr = latencyValues;
  var min = arr[0]; // min
  var max = arr[0]; // max
  var sum = arr[0]; // sum
  var avg;

  for (var i = 1; i < arr.length; i++) {
    if (arr[i] < min) {
      min = arr[i];
    }
    if (arr[i] > max) {
      max = arr[i];
    }
    sum = sum + arr[i];
  }

  avg = Math.round(sum / arr.length);

  var foo = `Min: <b>${min} ms </b>| Max: <b>${max} ms</b>| Avg: <b>${avg} ms</b>`;
  outputLat(foo);
  console.log("\n\n");
  console.log("############# LATENCY INFO #############");
  console.log(`Min: ${min} ms | Max: ${max} ms| Avg: ${avg} ms`);
  console.log("########################################");
  return [min, max, avg];
}

// <- WS ->

async function onOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onclose = () => reject(new Error("WebSocket closed"));
  });
}

// <- Put UI handlers here ->

// Listeners for buttons
window.onload = function () {
  document
    .getElementById("startButton")
    .addEventListener("click", runClient, false);
  document
    .getElementById("latencyButton")
    .addEventListener("click", latencyCalc, false);
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

function incrementBadge2() {
  var count = document.getElementById("recBadge");
  var number = count.innerHTML;
  number++;
  count.innerHTML = number;
}

function outputLat(x) {
  var out = document.getElementById("latput");
  out.innerHTML = x;
}

// Entry point
function runClient() {
  main();
}
