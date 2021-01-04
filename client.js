const { RTCClient } = require("webrtc-server-client-datachannel");
const { rtcConfig } = require("./rtc.config");
var ProgressBar = require("progressbar.js");

var latencyValues = []; // global array for now
var sentPerc = 0;
var recPerc = 0;

async function main() {
  try {
    const interval = 1000; // 1 second as a standard interval (10ms will send 100 packets)
    var freq = getFreqValue(); // amount of packets in one interval
    var duration = getDurValue(); // duration of test (x amount of pings * duration = net pings)  -- this adjusts duration this runs in ms
    if (!freq) {
      freq = 20; // default freq value
    }
    if (!duration) {
      duration = 5; // default dur value
    }
    var netPackets = freq * duration;
    var numSentPackets = 0;
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

    disableOutput();

    var t0 = setInterval(updateBar1, 100);
    var t1 = setInterval(updateBar2, 100);

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

        numSentPackets++;
        sentPerc = (numSentPackets / netPackets).toFixed(2);
        //console.log(`sentPerc: ${sentPerc}`);
        //updateBar1(numSentPackets, netPackets);
        //console.log(`Sent: ${numSentPackets} Net: ${netPackets}`);
        //console.log(`Bar1: ${(numSentPackets / netPackets).toFixed(2)}`);
        incrementBadge();

        if (freqCounter < freq) {
          setTimeout(innerSender, 1);
        }
      })();

      if (secondCounter < duration) {
        secondCounter++;
        setTimeout(outerSender, interval);
      }
    })();

    // Receive relay from server
    pc.udp.onmessage = (event) => {
      // catch and close when all expected packets are received (TODO: improve with timeout)
      // netPackets - 1 to account for bug
      if (numRecPackets === netPackets - 1) {
        ws.close();
      }

      numRecPackets++;
      recPerc = (numRecPackets / netPackets).toFixed(2);
      //console.log(`recPerc: ${recPerc}`);
      //updateBar2(numRecPackets, netPackets);
      //console.log(`Rec: ${numRecPackets} Net: ${netPackets}`);
      //console.log(`Bar2: ${(numRecPackets / netPackets).toFixed(2)}`);
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
      // Timeouts for fetching updates to prog bars
      setTimeout(function () {
        sentPerc = 0;
      }, 2000);
      setTimeout(function () {
        recPerc = 0;
      }, 2000);
      setTimeout(function () {
        clearInterval(t0);
      }, 1000);
      setTimeout(function () {
        clearInterval(t1);
      }, 1000);
      // ------------------------------------------
      setTimeout(function () {
        updateOutput();
      }, 1200);

      setTimeout(function () {
        fadeOut(document.getElementById("progbar1"), 500);
        fadeOut(document.getElementById("progbar2"), 500);
        fadeIn(document.getElementById("startButton"), 1000);
      }, 1500);
      console.log("ws closed");
    };
  } catch (error) {
    console.log(error);
  }
}

// #################### END MAIN ####################

window.onload = function () {
  document.getElementById("resultContainer").style.opacity = 0;
  document.getElementById("progbar1").style.opacity = 0;
  document.getElementById("progbar2").style.opacity = 0;
  document
    .getElementById("startButton")
    .addEventListener("click", runClient, false);

  document
    .getElementById("settingsButton")
    .addEventListener("click", toggleSettings, false);
};

async function onOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onclose = () => reject(new Error("WebSocket closed"));
  });
}

// #### UI Functions ####

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

  avg = sum / arr.length;

  return [min, max, avg];
}

function updateOutput() {
  var val1 = document.getElementById("val1");
  var val2 = document.getElementById("val2");
  var val3 = document.getElementById("val3");

  val1.style.color = "black";
  val2.style.color = "black";
  val3.style.color = "black";

  var result = latencyCalc();

  val1.innerHTML = result[0].toFixed(1);
  val2.innerHTML = result[1].toFixed(1);
  val3.innerHTML = result[2].toFixed(1);
}
function disableOutput() {
  document.getElementById("val1").style.color = "#D3D3D3";
  document.getElementById("val2").style.color = "#D3D3D3";
  document.getElementById("val3").style.color = "#D3D3D3";
}
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

function toggleSettings() {
  var x = document.getElementById("settingsBox");
  if (x.style.display === "none") {
    console.log(x.style.display);
    x.style.display = "block";
  } else {
    console.log(x.style.display);
    x.style.display = "none";
  }
}

function removeFadeOut(el, speed) {
  var seconds = speed / 1000;
  el.style.transition = "opacity " + seconds + "s ease";

  el.style.opacity = 0;
  setTimeout(function () {
    el.parentNode.removeChild(el);
  }, speed);
}
function fadeOut(el, speed) {
  var seconds = speed / 1000;
  el.style.transition = "opacity " + seconds + "s ease";
  el.style.opacity = 0;
}

function fadeIn(el, speed) {
  var seconds = speed / 1000;
  el.style.transition = "opacity " + seconds + "s ease";

  el.style.opacity = 1;
}

// Progress bars
var bar = new ProgressBar.Circle(progbar1, {
  color: "#aaa",
  // This has to be the same size as the maximum width to
  // prevent clipping
  strokeWidth: 4,
  trailWidth: 1,
  easing: "easeInOut",
  duration: 200,
  text: {
    autoStyleContainer: false,
  },
  from: { color: "#aaa", width: 1 },
  to: { color: "#333", width: 4 },
  // Set default step function for all animate calls
  step: function (state, circle) {
    circle.path.setAttribute("stroke", state.color);
    circle.path.setAttribute("stroke-width", state.width);

    var value = Math.round(circle.value() * 100);
    if (value === 0) {
      circle.setText("");
    } else {
      circle.setText(value);
    }
  },
});

var bar2 = new ProgressBar.Circle(progbar2, {
  color: "#aaa",
  // This has to be the same size as the maximum width to
  // prevent clipping
  strokeWidth: 4,
  trailWidth: 1,
  easing: "easeInOut",
  duration: 200,
  text: {
    autoStyleContainer: false,
  },
  from: { color: "#aaa", width: 1 },
  to: { color: "#333", width: 4 },
  // Set default step function for all animate calls
  step: function (state, circle) {
    circle.path.setAttribute("stroke", state.color);
    circle.path.setAttribute("stroke-width", state.width);

    var value = Math.round(circle.value() * 100);
    if (value === 0) {
      circle.setText("");
    } else {
      circle.setText(value);
    }
  },
});

bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
bar.text.style.fontSize = "2rem";
bar2.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
bar2.text.style.fontSize = "2rem";

function updateBar1() {
  bar.animate(sentPerc);
}

function updateBar2() {
  bar2.animate(recPerc);
}

// Entry point
function runClient() {
  fadeOut(document.getElementById("startButton"), 500);
  fadeIn(document.getElementById("progbar1"), 500);
  fadeIn(document.getElementById("progbar2"), 500);
  fadeIn(document.getElementById("resultContainer"), 500);
  setTimeout(main, 500);
}
