const { RTCClient } = require("webrtc-server-client-datachannel");
const { rtcConfig } = require("./rtc.config");
var ProgressBar = require("progressbar.js");

var latencyValues = []; // global array for now
var latencyRes = [];
var sentPerc = 0;
var recPerc = 0;
var ranOnce = false; // flag if we already entered the test

var freq;
var duration;
var acc_delay;
var packet_loss;
var mos;

async function main() {
  try {
    var time_run = performance.now();

    const interval = 1000; // 1 second as a standard interval (10ms will send 100 packets)
    freq = getFreq(); // amount of packets in one interval
    duration = getDur(); // duration of test (x amount of pings * duration = net pings)  -- this adjusts duration this runs in ms
    acc_delay = getAccDelay(); // acceptable delay threshold, flag packets in or above this as late

    if (!freq) {
      freq = 20; // default freq value
    }
    if (!duration) {
      duration = 5; // default dur value
    }
    if (!acc_delay) {
      acc_delay = 80;
    }
    var netPackets = freq * duration;
    var numSentPackets = 0;
    var numRecPackets = 0;
    latencyValues = [];
    latencyRes = [];

    //console.log("opening websocket");
    const ws = new WebSocket("ws://" + "18.217.186.186" + ":8080");
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
      //console.log("*---> SENT UDP PACKETS");
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

      // OLD CLOSE OUT OF WEBSOCKET
      // if (numRecPackets === netPackets - 1) {
      //   var time_close2 = performance.now();
      //   var time_test2 = Math.abs(time_run - time_close2);
      //   console.log("****** RUN TIME OLD: " + time_test2);
      //   //ws.close();
      // }

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

      if (packetRelayData.latency >= acc_delay) {
        packetRelayData.delivery = "late";
        latencyRes.push(packetRelayData.delivery);
      } else {
        packetRelayData.delivery = "ontime";
        latencyRes.push(packetRelayData.delivery);
      }

      //console.log("* RECEIVED SERVER RELAY | ", packetRelayData);
    };

    // NEW WAY TO CLOSE OUT WEBSOCKET
    setTimeout(function () {
      // Test time for each run of test until ws close
      var time_close = performance.now();
      var time_test = Math.abs(time_run - time_close);
      //console.log("****** RUN TIME NEW: " + time_test);
      //console.log("** REC PACKETS: " + numRecPackets);
      //console.log("** NET PACKETS: " + netPackets);
      packet_loss = 100 - (100 * numRecPackets) / netPackets;
      //console.log("****** PACKET LOSS: " + packet_loss + "%");
      ws.close();
    }, duration * 1000 - 300);

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
        clearBadges();
      }, 2000);
      setTimeout(function () {
        clearInterval(t0);
      }, 1000);
      setTimeout(function () {
        clearInterval(t1);
      }, 1000);

      // update output
      setTimeout(function () {
        updateOutput();
      }, 1200);

      // fade out bars
      setTimeout(function () {
        fadeOut(document.getElementById("progbar1"), 500);
        fadeOut(document.getElementById("progbar2"), 500);
      }, 1500);

      // fade out bar counters
      setTimeout(function () {
        fadeOut(document.getElementById("counterbar1"), 500);
        fadeOut(document.getElementById("counterbar2"), 500);
        fadeOut(document.getElementById("counterbar1sub"), 500);
        fadeOut(document.getElementById("counterbar2sub"), 500);
      }, 1500);

      // delete bar counters
      setTimeout(function () {
        document.getElementById("bar1Column").style.display = "none";
        document.getElementById("bar2Column").style.display = "none";
        document.getElementById("counterbar1sub").style.display = "none";
        document.getElementById("counterbar2sub").style.display = "none";
      }, 2000);

      // update result to be displayed between grade and go
      updateResult(getFreq(), getDur());

      // TODO: gradeSelect goes here
      gradeSelect();

      // fade in chart & end container
      setTimeout(function () {
        swapContent("startButtonDiv", "chartBox");
        document.getElementById("settingsButton").style.display = "block";
        document.getElementById("chartBox").style.display = "block";
        document.getElementById("endContainer").style.display = "block";
        document.getElementById("gradeCircle").style.opacity = 0;
        document.getElementById("endListResult").style.opacity = 0;
        document.getElementById("startButtonResult").style.opacity = 0;
      }, 2000);

      // Check if we are inside test
      if (ranOnce === true) {
        document.getElementById("chartBox").style.opacity = 1;
      }

      // fade in endContainer
      setTimeout(function () {
        fadeIn(document.getElementById("settingsButton"), 1000);
        fadeIn(document.getElementById("gradeCircle"), 500);
        fadeIn(document.getElementById("endListResult"), 1000);
        fadeIn(document.getElementById("startButtonResult"), 1500);
      }, 2200);

      //console.log("ws closed");

      // render chart.js
      setTimeout(function () {
        latencyLabel = Array.from(latencyValues.keys());
        backColorArray = new Array(latencyValues.length).fill("lightgray");
        var ctx = document.getElementById("myChart").getContext("2d");
        if (window.chart && window.chart !== null) {
          window.chart.destroy();
        }
        window.chart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: latencyLabel,
            datasets: [
              {
                label: "ms",
                data: latencyValues,
                backgroundColor: backColorArray,
                // borderColor: "gray",
                borderWidth: "1",
                hoverBackgroundColor: "gray",
                //hoverBorderColor: "black",
                hoverBorderWidth: "2",
              },
            ],
          },
          options: {
            layout: {
              padding: {
                left: 10,
                right: 10,
              },
            },
            tooltips: {
              enabled: true,
              mode: "single",
              displayColors: false,
              callbacks: {
                beforeTitle: function (tooltipItem, data) {
                  return "Packet ";
                },
                label: function (tooltipItems, data) {
                  return "Latency: " + tooltipItems.yLabel + " ms";
                },
              },
            },
            scales: {
              xAxes: [
                {
                  barThickness: 3,
                  display: false,
                  ticks: {
                    display: false,
                  },
                },
              ],

              yAxes: [
                {
                  display: false,
                  ticks: {
                    beginAtZero: false,
                    display: false,
                  },
                },
              ],
            },
            responsive: true,
            maintainAspectRatio: false,
            legend: {
              display: false,
            },
          },
        });

        var chartColors = {
          red: "rgb(255, 99, 132)",
          blue: "rgb(54, 162, 235)",
        };
        var colorChangeValue = acc_delay; //set this to whatever is the deciding color change value
        var dataset = window.chart.data.datasets[0];
        for (var i = 0; i < dataset.data.length; i++) {
          if (dataset.data[i] > colorChangeValue) {
            dataset.backgroundColor[i] = chartColors.red;
          }
        }
        window.chart.update();
      }, 2000);
    };
  } catch (error) {
    console.log(error);
  }
}

// #################### END MAIN ####################

window.onload = function () {
  document.getElementById("counterbar1").style.opacity = 0;
  document.getElementById("counterbar2").style.opacity = 0;
  document.getElementById("counterbar1sub").style.opacity = 0;
  document.getElementById("counterbar2sub").style.opacity = 0;
  document.getElementById("resultContainer").style.opacity = 0;
  document.getElementById("progbar1").style.opacity = 0;
  document.getElementById("progbar2").style.opacity = 0;
  document
    .getElementById("startButton")
    .addEventListener("click", runClient, false);

  document
    .getElementById("startButtonResult")
    .addEventListener("click", runClientEnd, false);

  document.getElementById("tb1_default").classList.add("active");
  document.getElementById("tb2_default").classList.add("active");
  document.getElementById("tb3_default").classList.add("active");

  tbController(
    ".btn-group > button.btn.btn-outline-secondary.tb1",
    "tb1_default",
    "freq"
  );
  tbController(
    ".btn-group > button.btn.btn-outline-secondary.tb2",
    "tb2_default",
    "dur"
  );
  tbController(
    ".btn-group > button.btn.btn-outline-secondary.tb3",
    "tb3_default",
    "delay"
  );
};

async function onOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onclose = () => reject(new Error("WebSocket closed"));
  });
}

function tbController(btn, df, type) {
  var num = null;
  var flag = false;
  var active_button;
  var ele = document.querySelectorAll(btn);
  //console.log(ele);

  for (var i = 0; i < ele.length; i++) {
    ele[i].addEventListener("click", function () {
      if (flag == true) {
        active_button.classList.remove("active");
      } else {
        document.getElementById(df).classList.remove("active");
      }
      flag = true;
      num = this.innerHTML;
      var new_val = num.replace(/\D/g, "");
      this.classList.add("active");
      active_button = this;
      //console.log(new_val);
      if (type == "freq") {
        setFreq(new_val);
      } else if (type == "dur") {
        setDur(new_val);
      } else if (type == "delay") {
        setAccDelay(new_val);
      }
    });
  }
}

// #### UI Functions ####

function latencyCalc() {
  // get only latency values LATENCY key
  arr = latencyValues;
  //console.log(arr);
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

// calculate jitter value accross all packet latency values
function jitterCalc() {
  arr = latencyValues;
  var sum = 0;

  for (i = 0; i < arr.length - 1; i++) {
    diff = Math.abs(arr[i] - arr[i + 1]);
    sum += diff;
  }

  return sum / (arr.length - 1);
}

// calculate percentage (%) of late packets (p over acc delay)
function latePacketCalc() {
  arr = latencyValues;
  ad = getAccDelay();
  var counter = 0;

  for (i = 0; i < arr.length; i++) {
    if (arr[i] > ad) {
      counter++;
    }
  }

  return (counter / arr.length) * 100;
}

function mosCalc(latency, jitter, ploss) {
  var effective_latency = latency + 2 * jitter;
  var r = 0;
  var mos = 0;

  if (effective_latency < 160) {
    r = 93.2 - effective_latency / 40;
  } else {
    r = 93.2 - (effective_latency - 120) / 10;
  }

  r = r - 2.5 * ploss;

  if (r < 0) {
    mos = 1.0;
  } else {
    mos = 1 + 0.035 * r + 0.000007 * r * (r - 60) * (100 - r);
  }

  return mos;
}

function gradeSelect() {
  gradeCircle = document.getElementById("gradeCircle");
  resultLabel = document.getElementById("endResult1");
  mosResultA = document.getElementById("mosResultA");
  mosResultB = document.getElementById("mosResultB");
  mosResultC = document.getElementById("mosResultC");
  mosResultD = document.getElementById("mosResultD");
  mosResultF = document.getElementById("mosResultF");
  modalLabelA = document.getElementById("gradeModalResultA");
  modalLabelB = document.getElementById("gradeModalResultB");
  modalLabelC = document.getElementById("gradeModalResultC");
  modalLabelD = document.getElementById("gradeModalResultD");
  modalLabelF = document.getElementById("gradeModalResultF");

  // Issues with rounding? Check this
  var latencyResult = latencyCalc();
  var jitterResult = parseInt(jitterCalc());
  var latePacketResult = latePacketCalc();
  var packetLossResult = packet_loss;

  mos_val = mosCalc(
    latencyResult[2].toFixed(1),
    jitterResult,
    packetLossResult
  );

  //mos_val = 1;
  mosResultA.innerHTML = mos_val.toFixed(2);
  mosResultB.innerHTML = mos_val.toFixed(2);
  mosResultC.innerHTML = mos_val.toFixed(2);
  mosResultD.innerHTML = mos_val.toFixed(2);
  mosResultF.innerHTML = mos_val.toFixed(2);
  // console.log("** MOS");
  // console.log(mos_val);
  // console.log("* values");
  // console.log(latencyResult[2].toFixed(1));
  // console.log(jitterResult);
  // console.log(packetLossResult);
  // console.log(latePacketResult);
  // console.log("** END MOS");

  if (mos_val >= 4.2) {
    gradeCircle.innerHTML = "A";
    mosResultA.style.color = "#a5c882";
    modalLabelA.style.color = "#a5c882";
  } else if (mos_val >= 3.5 && mos_val < 4.2) {
    gradeCircle.innerHTML = "B";
    gradeCircle.dataset.target = "#gradeBModal";
    gradeCircle.style.color = "#689F38";
    gradeCircle.style.border = "1px solid #689F38";
    resultLabel.innerHTML = "Good";
    resultLabel.style.color = "#689F38";
    mosResultB.style.color = "#689F38";
    modalLabelB.style.color = "#689F38";
    document.documentElement.style.setProperty("--clr-hover", "#689F38");
  } else if (mos_val >= 3 && mos_val < 3.5) {
    gradeCircle.innerHTML = "C";
    gradeCircle.dataset.target = "#gradeCModal";
    gradeCircle.style.color = "#FBC02D";
    gradeCircle.style.border = "1px solid #FBC02D";
    resultLabel.innerHTML = "Fair";
    resultLabel.style.color = "#FBC02D";
    mosResultC.style.color = "#FBC02D";
    modalLabelC.style.color = "#FBC02D";
    document.documentElement.style.setProperty("--clr-hover", "#FBC02D");
  } else if (mos_val >= 2 && mos_val < 3) {
    gradeCircle.innerHTML = "D";
    gradeCircle.dataset.target = "#gradeDModal";
    gradeCircle.style.color = "#FB8C00";
    gradeCircle.style.border = "1px solid #FB8C00";
    resultLabel.innerHTML = "Poor";
    resultLabel.style.color = "#FB8C00";
    mosResultD.style.color = "#FB8C00";
    modalLabelD.style.color = "#FB8C00";
    document.documentElement.style.setProperty("--clr-hover", "#FB8C00");
  } else if (mos_val >= 1 && mos_val < 2) {
    gradeCircle.innerHTML = "F";
    gradeCircle.dataset.target = "#gradeFModal";
    gradeCircle.style.color = "#F4511E";
    gradeCircle.style.border = "1px solid #F4511E";
    resultLabel.innerHTML = "Bad";
    resultLabel.style.color = "#F4511E";
    mosResultF.style.color = "#F4511E";
    modalLabelF.style.color = "#F4511E";
    document.documentElement.style.setProperty("--clr-hover", "#F4511E");
  }
}

function updateOutput() {
  var val1 = document.getElementById("val1");
  var val2 = document.getElementById("val2");
  var val3 = document.getElementById("val3");

  val1.style.color = "black";
  val2.style.color = "black";
  val3.style.color = "black";
  val4.style.color = "black";

  var latencyResult = latencyCalc();
  var jitterResult = jitterCalc();
  var latePacketResult = latePacketCalc();

  // commented due to change to resultBar
  // val1.innerHTML = latencyResult[0].toFixed(1);
  // val2.innerHTML = latencyResult[1].toFixed(1);
  val1.innerHTML = String(parseInt(latePacketResult));
  percHTML = '<span id="percSymbol">%</span>';
  val1.insertAdjacentHTML("beforeend", percHTML);
  val2.innerHTML = String(parseInt(packet_loss));
  val2.insertAdjacentHTML("beforeend", percHTML);
  val3.innerHTML = Math.round(latencyResult[2].toFixed(1));
  val4.innerHTML = parseInt(jitterResult);
}

function updateResult(x, y) {
  var freqResult = document.getElementById("endResult2num");
  var durResult = document.getElementById("endResult3num");

  freqResult.innerHTML = x;
  durResult.innerHTML = y;
}

function disableOutput() {
  document.getElementById("val1").style.color = "#D3D3D3";
  document.getElementById("val2").style.color = "#D3D3D3";
  document.getElementById("val3").style.color = "#D3D3D3";
  document.getElementById("val4").style.color = "#D3D3D3";
}

function setFreq(val) {
  freq = val;
}

function getFreq() {
  return freq;
}

function setDur(val) {
  duration = val;
}

function getDur() {
  return duration;
}

function setAccDelay(val) {
  acc_delay = val;
}

function getAccDelay() {
  return acc_delay;
}

function incrementBadge() {
  var count = document.getElementById("counterbar1");
  var number = count.innerHTML;
  number++;
  count.innerHTML = number;
}
function incrementBadge2() {
  var count = document.getElementById("counterbar2");
  var number = count.innerHTML;
  number++;
  count.innerHTML = number;
}

function clearBadges() {
  var badge_1 = document.getElementById("counterbar1");
  var badge_2 = document.getElementById("counterbar2");
  badge_1.innerHTML = 0;
  badge_2.innerHTML = 0;
}

function fadeOut(el, speed) {
  var seconds = speed / 1000;
  var old_tran = el.style.transition;
  el.style.transition = "opacity " + seconds + "s ease";
  el.style.opacity = 0;
  setTimeout(function () {
    el.style.transition = old_tran;
  }, 500);
}

function fadeIn(el, speed) {
  var seconds = speed / 1000;
  var old_tran = el.style.transition;
  el.style.transition = "opacity " + seconds + "s ease";
  el.style.opacity = 1;
  setTimeout(function () {
    el.style.transition = old_tran;
  }, 500);
}

function swapContent(x, y) {
  const main = document.getElementById(x);
  const div = document.getElementById(y);
  const clone = div.cloneNode(true);

  while (main.firstChild) main.firstChild.remove();

  main.appendChild(clone);
}

// Progress bars
var bar = new ProgressBar.Circle(progbar1, {
  color: "#757575",
  // This has to be the same size as the maximum width to
  // prevent clipping
  strokeWidth: 4,
  trailWidth: 1,
  easing: "easeInOut",
  duration: 200,
  text: {
    autoStyleContainer: true,
  },
  from: { color: "#E0E0E0", width: 1 },
  to: { color: "#B3E5FC", width: 4 },
  // Set default step function for all animate calls
  step: function (state, circle) {
    circle.path.setAttribute("stroke", state.color);
    circle.path.setAttribute("stroke-width", state.width);

    var value = Math.round(circle.value() * 100);
    if (value === 0) {
      circle.setText("");
    } else {
      circle.setText(value + " %");
    }
  },
});

var bar2 = new ProgressBar.Circle(progbar2, {
  color: "#757575",
  // This has to be the same size as the maximum width to
  // prevent clipping
  strokeWidth: 4,
  trailWidth: 1,
  easing: "easeInOut",
  duration: 200,
  text: {
    autoStyleContainer: true,
  },
  from: { color: "#E0E0E0", width: 1 },
  to: { color: "#AED581", width: 4 },
  // Set default step function for all animate calls
  step: function (state, circle) {
    circle.path.setAttribute("stroke", state.color);
    circle.path.setAttribute("stroke-width", state.width);

    var value = Math.round(circle.value() * 100);
    if (value === 0) {
      circle.setText("");
    } else {
      circle.setText(value + " %");
    }
  },
});

bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
bar.text.style.fontSize = "1.8rem";
bar2.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
bar2.text.style.fontSize = "1.8rem";

function updateBar1() {
  bar.animate(sentPerc);
}

function updateBar2() {
  bar2.animate(recPerc);
}

// Entry point
function runClient() {
  bar.set(0);
  bar2.set(0);
  ranOnce = true;
  fadeOut(document.getElementById("startButton"), 500);
  fadeOut(document.getElementById("settingsButton"), 500);
  document.getElementById("startButton").style.display = "none";
  document.getElementById("settingsButton").style.display = "none";
  // document.getElementById("progbar1").style.display = "block";
  // document.getElementById("progbar2").style.display = "block";
  fadeIn(document.getElementById("counterbar1"), 500);
  fadeIn(document.getElementById("counterbar2"), 500);
  fadeIn(document.getElementById("counterbar1sub"), 500);
  fadeIn(document.getElementById("counterbar2sub"), 500);
  fadeIn(document.getElementById("progbar1"), 500);
  fadeIn(document.getElementById("progbar2"), 500);
  fadeIn(document.getElementById("resultContainer"), 500);
  setTimeout(main, 1000);
}

function runClientEnd() {
  bar.set(0);
  bar2.set(0);
  // fade out old elements
  fadeOut(document.getElementById("settingsButton"), 500);
  fadeOut(document.getElementById("startButtonResult"), 500);
  fadeOut(document.getElementById("gradeCircle"), 500);
  fadeOut(document.getElementById("endListResult"), 500);
  fadeOut(document.getElementById("chartBox"), 500);

  //load in new elements
  setTimeout(function () {
    document.getElementById("settingsButton").style.display = "none";
    document.getElementById("chartBox").style.display = "none";
    document.getElementById("bar1Column").style.display = "block";
    document.getElementById("bar2Column").style.display = "block";
    document.getElementById("counterbar1sub").style.display = "block";
    document.getElementById("counterbar2sub").style.display = "block";
    document.getElementById("progbar1").style.display = "block";
    document.getElementById("progbar2").style.display = "block";

    document.getElementById("bar1Column").style.opacity = 0;
    document.getElementById("bar2Column").style.opacity = 0;
    document.getElementById("counterbar1sub").style.opacity = 0;
    document.getElementById("counterbar2sub").style.opacity = 0;
    document.getElementById("progbar1").style.opacity = 0;
    document.getElementById("progbar2").style.opacity = 0;
  }, 600);

  // fade in test elements
  setTimeout(function () {
    fadeIn(document.getElementById("bar1Column"), 700);
    fadeIn(document.getElementById("bar2Column"), 700);
    fadeIn(document.getElementById("counterbar1"), 700);
    fadeIn(document.getElementById("counterbar2"), 700);
    fadeIn(document.getElementById("counterbar1sub"), 700);
    fadeIn(document.getElementById("counterbar2sub"), 700);
    fadeIn(document.getElementById("progbar1"), 700);
    fadeIn(document.getElementById("progbar2"), 700);
    fadeIn(document.getElementById("resultContainer"), 700);
  }, 650);
  setTimeout(main, 1000);
}
