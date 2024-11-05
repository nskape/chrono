(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { RTCClient } = require("webrtc-server-client-datachannel");
const { rtcConfig } = require("./rtc.config");
const global_state = require('./global-state');
const helper = require('./helper');
const ui = require('./ui');
const webrtc = require('./webrtc-client');

/**
 * Main function to run the WebSocket and RTC client test.
 * It initializes the WebSocket connection, sets up the RTC client,
 * sends UDP packets at specified intervals, and handles the reception
 * of packets from the server. It also manages the UI updates and
 * calculates latency and packet loss.
 *
 * @async
 * @function main
 * @throws Will throw an error if the WebSocket or RTC client setup fails.
 */
async function main() {
  try {
    var time_run = performance.now();

    const interval = 1000; // 1 second as a standard interval (10ms will send 100 packets)
    global_state.freq = helper.getFreq(); // amount of packets in one interval
    global_state.duration = helper.getDur(); // duration of test (x amount of pings * duration = net pings)  -- this adjusts duration this runs in ms
    global_state.acc_delay = helper.getAccDelay(); // acceptable delay threshold, flag packets in or above this as late

    if (!global_state.freq) {
      global_state.freq = 20; // default freq value
    }
    if (!global_state.duration) {
      global_state.duration = 5; // default dur value
    }
    if (!global_state.acc_delay) {
      global_state.acc_delay = 80;
    }
    var netPackets = global_state.freq * global_state.duration;
    var numSentPackets = 0;
    var numRecPackets = 0;
    global_state.latencyValues = [];
    global_state.latencyRes = [];

    //console.log("opening websocket");
    const ws = new WebSocket("ws://" + "localhost" + ":8080");
    await webrtc.onOpen(ws);

    let pc = new RTCClient(
      ws,
      rtcConfig.RTCPeerConnectionConf,
      rtcConfig.datachannels
    );
    await pc.create();

    // Send UDP packet to server within interval

    var packetID = 0; // ID of each packet
    var secondCounter = 1; // count at 1 because function runs once at first

    ui.disableOutput();

    var t0 = setInterval(ui.updateBar1, 100);
    var t1 = setInterval(ui.updateBar2, 100);

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
        global_state.sentPerc = (numSentPackets / netPackets).toFixed(2);
        //console.log(`sentPerc: ${sentPerc}`);
        //updateBar1(numSentPackets, netPackets);
        //console.log(`Sent: ${numSentPackets} Net: ${netPackets}`);
        //console.log(`Bar1: ${(numSentPackets / netPackets).toFixed(2)}`);
        ui.incrementBadge();

        if (freqCounter < global_state.freq) {
          setTimeout(innerSender, 1);
        }
      })();

      if (secondCounter < global_state.duration) {
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
      global_state.recPerc = (numRecPackets / netPackets).toFixed(2);
      //console.log(`recPerc: ${recPerc}`);
      //updateBar2(numRecPackets, netPackets);
      //console.log(`Rec: ${numRecPackets} Net: ${netPackets}`);
      //console.log(`Bar2: ${(numRecPackets / netPackets).toFixed(2)}`);
      ui.incrementBadge2();
      packetRelayData = JSON.parse(event.data); // receive and parse packet data from server
      var endDate = performance.now();
      packetRelayData.endTime = endDate; // append end trip time to JSON

      // calculate latency and append to JSON
      packetRelayData.latency = Math.round(
        Math.abs(packetRelayData.endTime - packetRelayData.startTime)
      );
      global_state.latencyValues.push(packetRelayData.latency);

      if (packetRelayData.latency >= global_state.acc_delay) {
        packetRelayData.delivery = "late";
        global_state.latencyRes.push(packetRelayData.delivery);
      } else {
        packetRelayData.delivery = "ontime";
        global_state.latencyRes.push(packetRelayData.delivery);
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
      global_state.packet_loss = 100 - (100 * numRecPackets) / netPackets;
      //console.log("****** PACKET LOSS: " + packet_loss + "%");
      ws.close();
    }, global_state.duration * 1000 - 300);

    // On WS close
    ws.onclose = function (event) {
      // Timeouts for fetching updates to prog bars
      setTimeout(function () {
        global_state.sentPerc = 0;
      }, 2000);
      setTimeout(function () {
        global_state.recPerc = 0;
      }, 2000);
      setTimeout(function () {
        ui.clearBadges();
      }, 2000);
      setTimeout(function () {
        clearInterval(t0);
      }, 1000);
      setTimeout(function () {
        clearInterval(t1);
      }, 1000);

      // update output
      setTimeout(function () {
        ui.updateOutput();
      }, 1200);

      // fade out bars
      setTimeout(function () {
        ui.fadeOut(document.getElementById("progbar1"), 500);
        ui.fadeOut(document.getElementById("progbar2"), 500);
      }, 1500);

      // fade out bar counters
      setTimeout(function () {
        ui.fadeOut(document.getElementById("counterbar1"), 500);
        ui.fadeOut(document.getElementById("counterbar2"), 500);
        ui.fadeOut(document.getElementById("counterbar1sub"), 500);
        ui.fadeOut(document.getElementById("counterbar2sub"), 500);
      }, 1500);

      // delete bar counters
      setTimeout(function () {
        document.getElementById("bar1Column").style.display = "none";
        document.getElementById("bar2Column").style.display = "none";
        document.getElementById("counterbar1sub").style.display = "none";
        document.getElementById("counterbar2sub").style.display = "none";
      }, 2000);

      // update result to be displayed between grade and go
      ui.updateResult(helper.getFreq(), helper.getDur());

      // TODO: gradeSelect goes here
      helper.gradeSelect();

      // fade in chart & end container
      setTimeout(function () {
        ui.swapContent("startButtonDiv", "chartBox");
        document.getElementById("settingsButton").style.display = "block";
        document.getElementById("chartBox").style.display = "block";
        document.getElementById("endContainer").style.display = "block";
        document.getElementById("gradeCircle").style.opacity = 0;
        document.getElementById("endListResult").style.opacity = 0;
        document.getElementById("startButtonResult").style.opacity = 0;
      }, 2000);

      // Check if we are inside test
      if (global_state.ranOnce === true) {
        document.getElementById("chartBox").style.opacity = 1;
      }

      // fade in endContainer
      setTimeout(function () {
        ui.fadeIn(document.getElementById("settingsButton"), 1000);
        ui.fadeIn(document.getElementById("gradeCircle"), 500);
        ui.fadeIn(document.getElementById("endListResult"), 1000);
        ui.fadeIn(document.getElementById("startButtonResult"), 1500);
      }, 2200);

      //console.log("ws closed");

      // render chart.js
      setTimeout(function () {
        latencyLabel = Array.from(global_state.latencyValues.keys());
        backColorArray = new Array(global_state.latencyValues.length).fill("lightgray");
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
                data: global_state.latencyValues,
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
        var colorChangeValue = global_state.acc_delay; //set this to whatever is the deciding color change value
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

  ui.tbController(
    ".btn-group > button.btn.btn-outline-secondary.tb1",
    "tb1_default",
    "freq"
  );
  ui.tbController(
    ".btn-group > button.btn.btn-outline-secondary.tb2",
    "tb2_default",
    "dur"
  );
  ui.tbController(
    ".btn-group > button.btn.btn-outline-secondary.tb3",
    "tb3_default",
    "delay"
  );
};

// Entry point
/**
 * Initializes and runs the client application.
 * 
 * This function performs the following actions:
 * - Resets progress bars `bar` and `bar2` to 0.
 * - Sets the `ranOnce` flag to true.
 * - Fades out the start and settings buttons over 500 milliseconds.
 * - Hides the start and settings buttons.
 * - Fades in various UI elements including counter bars, progress bars, and the result container over 500 milliseconds.
 * - Calls the `main` function after a delay of 1000 milliseconds.
 */
function runClient() {
  ui.bar.set(0);
  ui.bar2.set(0);
  global_state.ranOnce = true;
  ui.fadeOut(document.getElementById("startButton"), 500);
  ui.fadeOut(document.getElementById("settingsButton"), 500);
  document.getElementById("startButton").style.display = "none";
  document.getElementById("settingsButton").style.display = "none";
  // document.getElementById("progbar1").style.display = "block";
  // document.getElementById("progbar2").style.display = "block";
  ui.fadeIn(document.getElementById("counterbar1"), 500);
  ui.fadeIn(document.getElementById("counterbar2"), 500);
  ui.fadeIn(document.getElementById("counterbar1sub"), 500);
  ui.fadeIn(document.getElementById("counterbar2sub"), 500);
  ui.fadeIn(document.getElementById("progbar1"), 500);
  ui.fadeIn(document.getElementById("progbar2"), 500);
  ui.fadeIn(document.getElementById("resultContainer"), 500);
  setTimeout(main, 1000);
}

/**
 * Executes the client end sequence by resetting progress bars, fading out old elements,
 * and fading in new elements with a series of timed transitions.
 *
 * The function performs the following steps:
 * 1. Resets the progress bars `bar` and `bar2` to 0.
 * 2. Fades out old elements such as settings button, start button result, grade circle, end list result, and chart box.
 * 3. After a delay, hides some elements and displays new elements with zero opacity.
 * 4. Fades in the new elements with a smooth transition.
 * 5. Calls the `main` function after all transitions are complete.
 */
function runClientEnd() {
  ui.bar.set(0);
  ui.bar2.set(0);
  // fade out old elements
  ui.fadeOut(document.getElementById("settingsButton"), 500);
  ui.fadeOut(document.getElementById("startButtonResult"), 500);
  ui.fadeOut(document.getElementById("gradeCircle"), 500);
  ui.fadeOut(document.getElementById("endListResult"), 500);
  ui.fadeOut(document.getElementById("chartBox"), 500);

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
    ui.fadeIn(document.getElementById("bar1Column"), 700);
    ui.fadeIn(document.getElementById("bar2Column"), 700);
    ui.fadeIn(document.getElementById("counterbar1"), 700);
    ui.fadeIn(document.getElementById("counterbar2"), 700);
    ui.fadeIn(document.getElementById("counterbar1sub"), 700);
    ui.fadeIn(document.getElementById("counterbar2sub"), 700);
    ui.fadeIn(document.getElementById("progbar1"), 700);
    ui.fadeIn(document.getElementById("progbar2"), 700);
    ui.fadeIn(document.getElementById("resultContainer"), 700);
  }, 650);
  setTimeout(main, 1000);
}

},{"./global-state":2,"./helper":3,"./rtc.config":18,"./ui":19,"./webrtc-client":20,"webrtc-server-client-datachannel":13}],2:[function(require,module,exports){
/**
 * @file global-state.js
 * @description global variables to manage test state
 */

var latencyValues = []; // global array for now
var latencyRes = [];
var sentPerc = 0;
var recPerc = 0;
var ranOnce = false; // flag if we already entered the test

var freq;
var duration;
var acc_delay;
var packet_loss;
},{}],3:[function(require,module,exports){
/**
 * helper.js
 * This file will contain utility functions that are used across different parts of the application.
 */
const global_state = require('./global-state');
/**
 * Calculates the latency values (min, max, avg) from the latencyValues array.
 * @returns {Array} - An array containing min, max, and avg latency values.
 */
function latencyCalc() {
    // get only latency values LATENCY key
    arr = global_state.latencyValues;
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

/**
 * Calculates the jitter value across all packet latency values.
 * @returns {number} - The jitter value.
 */
function jitterCalc() {
    arr = global_state.latencyValues;
    var sum = 0;

    for (i = 0; i < arr.length - 1; i++) {
        diff = Math.abs(arr[i] - arr[i + 1]);
        sum += diff;
    }

    return sum / (arr.length - 1);
}

/**
 * Calculates the percentage of late packets (p over acc delay).
 * @returns {number} - The percentage of late packets.
 */
function latePacketCalc() {
    arr = global_state.latencyValues;
    ad = getAccDelay();
    var counter = 0;

    for (i = 0; i < arr.length; i++) {
        if (arr[i] > ad) {
            counter++;
        }
    }

    return (counter / arr.length) * 100;
}

/**
 * Calculates the Mean Opinion Score (MOS) based on latency, jitter, and packet loss.
 * @param {number} latency - The latency value.
 * @param {number} jitter - The jitter value.
 * @param {number} ploss - The packet loss percentage.
 * @returns {number} - The MOS value.
 */
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

/**
 * Selects the grade based on the MOS value.
 * @returns {string} - The grade.
 */
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
    var packetLossResult = global_state.packet_loss;

    mos_val = mosCalc(
        latencyResult[2].toFixed(1),
        jitterResult,
        packetLossResult
    );

    //mos_val = 4;
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
        document.documentElement.style.setProperty("--shadowColor", "#a5c882");
        gradeCircle.innerHTML = "A";
        gradeCircle.dataset.target = "#gradeAModal";
        gradeCircle.style.color = "#000818";
        gradeCircle.style.backgroundColor = "#a5c882";
        gradeCircle.style.border = "1px solid #a5c882";
        resultLabel.innerHTML = "Excellent";
        resultLabel.style.color = "#a5c882";
        mosResultA.style.color = "#a5c882";
        modalLabelA.style.color = "#a5c882";
    } else if (mos_val >= 3.5 && mos_val < 4.2) {
        document.documentElement.style.setProperty("--shadowColor", "#689F38");
        gradeCircle.innerHTML = "B";
        gradeCircle.dataset.target = "#gradeBModal";
        gradeCircle.style.color = "#000818";
        gradeCircle.style.backgroundColor = "#689F38";
        gradeCircle.style.border = "1px solid #689F38";
        resultLabel.innerHTML = "Good";
        resultLabel.style.color = "#689F38";
        mosResultB.style.color = "#689F38";
        modalLabelB.style.color = "#689F38";
    } else if (mos_val >= 3 && mos_val < 3.5) {
        document.documentElement.style.setProperty("--shadowColor", "#FBC02D");
        gradeCircle.innerHTML = "C";
        gradeCircle.dataset.target = "#gradeCModal";
        gradeCircle.style.color = "#000818";
        gradeCircle.style.backgroundColor = "#FBC02D";
        gradeCircle.style.border = "1px solid #FBC02D";
        resultLabel.innerHTML = "Fair";
        resultLabel.style.color = "#FBC02D";
        mosResultC.style.color = "#FBC02D";
        modalLabelC.style.color = "#FBC02D";
    } else if (mos_val >= 2 && mos_val < 3) {
        document.documentElement.style.setProperty("--shadowColor", "#FB8C00");
        gradeCircle.innerHTML = "D";
        gradeCircle.dataset.target = "#gradeDModal";
        gradeCircle.style.color = "#000818";
        gradeCircle.style.backgroundColor = "#FB8C00";
        gradeCircle.style.border = "1px solid #FB8C00";
        resultLabel.innerHTML = "Poor";
        resultLabel.style.color = "#FB8C00";
        mosResultD.style.color = "#FB8C00";
        modalLabelD.style.color = "#FB8C00";
    } else if (mos_val >= 1 && mos_val < 2) {
        document.documentElement.style.setProperty("--shadowColor", "#F4511E");
        gradeCircle.innerHTML = "F";
        gradeCircle.dataset.target = "#gradeFModal";
        gradeCircle.style.color = "#000818";
        gradeCircle.style.backgroundColor = "#F4511E";
        gradeCircle.style.border = "1px solid #F4511E";
        resultLabel.innerHTML = "Bad";
        resultLabel.style.color = "#F4511E";
        mosResultF.style.color = "#F4511E";
        modalLabelF.style.color = "#F4511E";
    }
}

/**
 * Sets the frequency value.
 * @param {number} val - The frequency value.
 */
function setFreq(val) {
    console.log("Setting freq to: " + val);
    global_state.freq = val;
}

/**
 * Gets the frequency value.
 * @returns {number} - The frequency value.
 */
function getFreq() {
    return global_state.freq;
}

/**
 * Sets the duration value.
 * @param {number} val - The duration value.
 */
function setDur(val) {
    global_state.duration = val;
}

/**
 * Gets the duration value.
 * @returns {number} - The duration value.
 */
function getDur() {
    return global_state.duration;
}

/**
 * Sets the acceptable delay value.
 * @param {number} val - The acceptable delay value.
 */
function setAccDelay(val) {
    global_state.acc_delay = val;
}

/**
 * Gets the acceptable delay value.
 * @returns {number} - The acceptable delay value.
 */
function getAccDelay() {
    return global_state.acc_delay;
}

module.exports = {
    latencyCalc,
    jitterCalc,
    latePacketCalc,
    mosCalc,
    gradeSelect,
    setFreq,
    getFreq,
    setDur,
    getDur,
    setAccDelay,
    getAccDelay
};
},{"./global-state":2}],4:[function(require,module,exports){
// Circle shaped progress bar

var Shape = require('./shape');
var utils = require('./utils');

var Circle = function Circle(container, options) {
    // Use two arcs to form a circle
    // See this answer http://stackoverflow.com/a/10477334/1446092
    this._pathTemplate =
        'M 50,50 m 0,-{radius}' +
        ' a {radius},{radius} 0 1 1 0,{2radius}' +
        ' a {radius},{radius} 0 1 1 0,-{2radius}';

    this.containerAspectRatio = 1;

    Shape.apply(this, arguments);
};

Circle.prototype = new Shape();
Circle.prototype.constructor = Circle;

Circle.prototype._pathString = function _pathString(opts) {
    var widthOfWider = opts.strokeWidth;
    if (opts.trailWidth && opts.trailWidth > opts.strokeWidth) {
        widthOfWider = opts.trailWidth;
    }

    var r = 50 - widthOfWider / 2;

    return utils.render(this._pathTemplate, {
        radius: r,
        '2radius': r * 2
    });
};

Circle.prototype._trailString = function _trailString(opts) {
    return this._pathString(opts);
};

module.exports = Circle;

},{"./shape":9,"./utils":11}],5:[function(require,module,exports){
// Line shaped progress bar

var Shape = require('./shape');
var utils = require('./utils');

var Line = function Line(container, options) {
    this._pathTemplate = 'M 0,{center} L 100,{center}';
    Shape.apply(this, arguments);
};

Line.prototype = new Shape();
Line.prototype.constructor = Line;

Line.prototype._initializeSvg = function _initializeSvg(svg, opts) {
    svg.setAttribute('viewBox', '0 0 100 ' + opts.strokeWidth);
    svg.setAttribute('preserveAspectRatio', 'none');
};

Line.prototype._pathString = function _pathString(opts) {
    return utils.render(this._pathTemplate, {
        center: opts.strokeWidth / 2
    });
};

Line.prototype._trailString = function _trailString(opts) {
    return this._pathString(opts);
};

module.exports = Line;

},{"./shape":9,"./utils":11}],6:[function(require,module,exports){
module.exports = {
    // Higher level API, different shaped progress bars
    Line: require('./line'),
    Circle: require('./circle'),
    SemiCircle: require('./semicircle'),
    Square: require('./square'),

    // Lower level API to use any SVG path
    Path: require('./path'),

    // Base-class for creating new custom shapes
    // to be in line with the API of built-in shapes
    // Undocumented.
    Shape: require('./shape'),

    // Internal utils, undocumented.
    utils: require('./utils')
};

},{"./circle":4,"./line":5,"./path":7,"./semicircle":8,"./shape":9,"./square":10,"./utils":11}],7:[function(require,module,exports){
// Lower level API to animate any kind of svg path

var shifty = require('shifty');
var utils = require('./utils');

var Tweenable = shifty.Tweenable;

var EASING_ALIASES = {
    easeIn: 'easeInCubic',
    easeOut: 'easeOutCubic',
    easeInOut: 'easeInOutCubic'
};

var Path = function Path(path, opts) {
    // Throw a better error if not initialized with `new` keyword
    if (!(this instanceof Path)) {
        throw new Error('Constructor was called without new keyword');
    }

    // Default parameters for animation
    opts = utils.extend({
        delay: 0,
        duration: 800,
        easing: 'linear',
        from: {},
        to: {},
        step: function() {}
    }, opts);

    var element;
    if (utils.isString(path)) {
        element = document.querySelector(path);
    } else {
        element = path;
    }

    // Reveal .path as public attribute
    this.path = element;
    this._opts = opts;
    this._tweenable = null;

    // Set up the starting positions
    var length = this.path.getTotalLength();
    this.path.style.strokeDasharray = length + ' ' + length;
    this.set(0);
};

Path.prototype.value = function value() {
    var offset = this._getComputedDashOffset();
    var length = this.path.getTotalLength();

    var progress = 1 - offset / length;
    // Round number to prevent returning very small number like 1e-30, which
    // is practically 0
    return parseFloat(progress.toFixed(6), 10);
};

Path.prototype.set = function set(progress) {
    this.stop();

    this.path.style.strokeDashoffset = this._progressToOffset(progress);

    var step = this._opts.step;
    if (utils.isFunction(step)) {
        var easing = this._easing(this._opts.easing);
        var values = this._calculateTo(progress, easing);
        var reference = this._opts.shape || this;
        step(values, reference, this._opts.attachment);
    }
};

Path.prototype.stop = function stop() {
    this._stopTween();
    this.path.style.strokeDashoffset = this._getComputedDashOffset();
};

// Method introduced here:
// http://jakearchibald.com/2013/animated-line-drawing-svg/
Path.prototype.animate = function animate(progress, opts, cb) {
    opts = opts || {};

    if (utils.isFunction(opts)) {
        cb = opts;
        opts = {};
    }

    var passedOpts = utils.extend({}, opts);

    // Copy default opts to new object so defaults are not modified
    var defaultOpts = utils.extend({}, this._opts);
    opts = utils.extend(defaultOpts, opts);

    var shiftyEasing = this._easing(opts.easing);
    var values = this._resolveFromAndTo(progress, shiftyEasing, passedOpts);

    this.stop();

    // Trigger a layout so styles are calculated & the browser
    // picks up the starting position before animating
    this.path.getBoundingClientRect();

    var offset = this._getComputedDashOffset();
    var newOffset = this._progressToOffset(progress);

    var self = this;
    this._tweenable = new Tweenable();
    this._tweenable.tween({
        from: utils.extend({ offset: offset }, values.from),
        to: utils.extend({ offset: newOffset }, values.to),
        duration: opts.duration,
        delay: opts.delay,
        easing: shiftyEasing,
        step: function(state) {
            self.path.style.strokeDashoffset = state.offset;
            var reference = opts.shape || self;
            opts.step(state, reference, opts.attachment);
        }
    }).then(function(state) {
        if (utils.isFunction(cb)) {
            cb();
        }
    });
};

Path.prototype._getComputedDashOffset = function _getComputedDashOffset() {
    var computedStyle = window.getComputedStyle(this.path, null);
    return parseFloat(computedStyle.getPropertyValue('stroke-dashoffset'), 10);
};

Path.prototype._progressToOffset = function _progressToOffset(progress) {
    var length = this.path.getTotalLength();
    return length - progress * length;
};

// Resolves from and to values for animation.
Path.prototype._resolveFromAndTo = function _resolveFromAndTo(progress, easing, opts) {
    if (opts.from && opts.to) {
        return {
            from: opts.from,
            to: opts.to
        };
    }

    return {
        from: this._calculateFrom(easing),
        to: this._calculateTo(progress, easing)
    };
};

// Calculate `from` values from options passed at initialization
Path.prototype._calculateFrom = function _calculateFrom(easing) {
    return shifty.interpolate(this._opts.from, this._opts.to, this.value(), easing);
};

// Calculate `to` values from options passed at initialization
Path.prototype._calculateTo = function _calculateTo(progress, easing) {
    return shifty.interpolate(this._opts.from, this._opts.to, progress, easing);
};

Path.prototype._stopTween = function _stopTween() {
    if (this._tweenable !== null) {
        this._tweenable.stop();
        this._tweenable = null;
    }
};

Path.prototype._easing = function _easing(easing) {
    if (EASING_ALIASES.hasOwnProperty(easing)) {
        return EASING_ALIASES[easing];
    }

    return easing;
};

module.exports = Path;

},{"./utils":11,"shifty":12}],8:[function(require,module,exports){
// Semi-SemiCircle shaped progress bar

var Shape = require('./shape');
var Circle = require('./circle');
var utils = require('./utils');

var SemiCircle = function SemiCircle(container, options) {
    // Use one arc to form a SemiCircle
    // See this answer http://stackoverflow.com/a/10477334/1446092
    this._pathTemplate =
        'M 50,50 m -{radius},0' +
        ' a {radius},{radius} 0 1 1 {2radius},0';

    this.containerAspectRatio = 2;

    Shape.apply(this, arguments);
};

SemiCircle.prototype = new Shape();
SemiCircle.prototype.constructor = SemiCircle;

SemiCircle.prototype._initializeSvg = function _initializeSvg(svg, opts) {
    svg.setAttribute('viewBox', '0 0 100 50');
};

SemiCircle.prototype._initializeTextContainer = function _initializeTextContainer(
    opts,
    container,
    textContainer
) {
    if (opts.text.style) {
        // Reset top style
        textContainer.style.top = 'auto';
        textContainer.style.bottom = '0';

        if (opts.text.alignToBottom) {
            utils.setStyle(textContainer, 'transform', 'translate(-50%, 0)');
        } else {
            utils.setStyle(textContainer, 'transform', 'translate(-50%, 50%)');
        }
    }
};

// Share functionality with Circle, just have different path
SemiCircle.prototype._pathString = Circle.prototype._pathString;
SemiCircle.prototype._trailString = Circle.prototype._trailString;

module.exports = SemiCircle;

},{"./circle":4,"./shape":9,"./utils":11}],9:[function(require,module,exports){
// Base object for different progress bar shapes

var Path = require('./path');
var utils = require('./utils');

var DESTROYED_ERROR = 'Object is destroyed';

var Shape = function Shape(container, opts) {
    // Throw a better error if progress bars are not initialized with `new`
    // keyword
    if (!(this instanceof Shape)) {
        throw new Error('Constructor was called without new keyword');
    }

    // Prevent calling constructor without parameters so inheritance
    // works correctly. To understand, this is how Shape is inherited:
    //
    //   Line.prototype = new Shape();
    //
    // We just want to set the prototype for Line.
    if (arguments.length === 0) {
        return;
    }

    // Default parameters for progress bar creation
    this._opts = utils.extend({
        color: '#555',
        strokeWidth: 1.0,
        trailColor: null,
        trailWidth: null,
        fill: null,
        text: {
            style: {
                color: null,
                position: 'absolute',
                left: '50%',
                top: '50%',
                padding: 0,
                margin: 0,
                transform: {
                    prefix: true,
                    value: 'translate(-50%, -50%)'
                }
            },
            autoStyleContainer: true,
            alignToBottom: true,
            value: null,
            className: 'progressbar-text'
        },
        svgStyle: {
            display: 'block',
            width: '100%'
        },
        warnings: false
    }, opts, true);  // Use recursive extend

    // If user specifies e.g. svgStyle or text style, the whole object
    // should replace the defaults to make working with styles easier
    if (utils.isObject(opts) && opts.svgStyle !== undefined) {
        this._opts.svgStyle = opts.svgStyle;
    }
    if (utils.isObject(opts) && utils.isObject(opts.text) && opts.text.style !== undefined) {
        this._opts.text.style = opts.text.style;
    }

    var svgView = this._createSvgView(this._opts);

    var element;
    if (utils.isString(container)) {
        element = document.querySelector(container);
    } else {
        element = container;
    }

    if (!element) {
        throw new Error('Container does not exist: ' + container);
    }

    this._container = element;
    this._container.appendChild(svgView.svg);
    if (this._opts.warnings) {
        this._warnContainerAspectRatio(this._container);
    }

    if (this._opts.svgStyle) {
        utils.setStyles(svgView.svg, this._opts.svgStyle);
    }

    // Expose public attributes before Path initialization
    this.svg = svgView.svg;
    this.path = svgView.path;
    this.trail = svgView.trail;
    this.text = null;

    var newOpts = utils.extend({
        attachment: undefined,
        shape: this
    }, this._opts);
    this._progressPath = new Path(svgView.path, newOpts);

    if (utils.isObject(this._opts.text) && this._opts.text.value !== null) {
        this.setText(this._opts.text.value);
    }
};

Shape.prototype.animate = function animate(progress, opts, cb) {
    if (this._progressPath === null) {
        throw new Error(DESTROYED_ERROR);
    }

    this._progressPath.animate(progress, opts, cb);
};

Shape.prototype.stop = function stop() {
    if (this._progressPath === null) {
        throw new Error(DESTROYED_ERROR);
    }

    // Don't crash if stop is called inside step function
    if (this._progressPath === undefined) {
        return;
    }

    this._progressPath.stop();
};

Shape.prototype.pause = function pause() {
    if (this._progressPath === null) {
        throw new Error(DESTROYED_ERROR);
    }

    if (this._progressPath === undefined) {
        return;
    }

    if (!this._progressPath._tweenable) {
        // It seems that we can't pause this
        return;
    }

    this._progressPath._tweenable.pause();
};

Shape.prototype.resume = function resume() {
    if (this._progressPath === null) {
        throw new Error(DESTROYED_ERROR);
    }

    if (this._progressPath === undefined) {
        return;
    }

    if (!this._progressPath._tweenable) {
        // It seems that we can't resume this
        return;
    }

    this._progressPath._tweenable.resume();
};

Shape.prototype.destroy = function destroy() {
    if (this._progressPath === null) {
        throw new Error(DESTROYED_ERROR);
    }

    this.stop();
    this.svg.parentNode.removeChild(this.svg);
    this.svg = null;
    this.path = null;
    this.trail = null;
    this._progressPath = null;

    if (this.text !== null) {
        this.text.parentNode.removeChild(this.text);
        this.text = null;
    }
};

Shape.prototype.set = function set(progress) {
    if (this._progressPath === null) {
        throw new Error(DESTROYED_ERROR);
    }

    this._progressPath.set(progress);
};

Shape.prototype.value = function value() {
    if (this._progressPath === null) {
        throw new Error(DESTROYED_ERROR);
    }

    if (this._progressPath === undefined) {
        return 0;
    }

    return this._progressPath.value();
};

Shape.prototype.setText = function setText(newText) {
    if (this._progressPath === null) {
        throw new Error(DESTROYED_ERROR);
    }

    if (this.text === null) {
        // Create new text node
        this.text = this._createTextContainer(this._opts, this._container);
        this._container.appendChild(this.text);
    }

    // Remove previous text and add new
    if (utils.isObject(newText)) {
        utils.removeChildren(this.text);
        this.text.appendChild(newText);
    } else {
        this.text.innerHTML = newText;
    }
};

Shape.prototype._createSvgView = function _createSvgView(opts) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this._initializeSvg(svg, opts);

    var trailPath = null;
    // Each option listed in the if condition are 'triggers' for creating
    // the trail path
    if (opts.trailColor || opts.trailWidth) {
        trailPath = this._createTrail(opts);
        svg.appendChild(trailPath);
    }

    var path = this._createPath(opts);
    svg.appendChild(path);

    return {
        svg: svg,
        path: path,
        trail: trailPath
    };
};

Shape.prototype._initializeSvg = function _initializeSvg(svg, opts) {
    svg.setAttribute('viewBox', '0 0 100 100');
};

Shape.prototype._createPath = function _createPath(opts) {
    var pathString = this._pathString(opts);
    return this._createPathElement(pathString, opts);
};

Shape.prototype._createTrail = function _createTrail(opts) {
    // Create path string with original passed options
    var pathString = this._trailString(opts);

    // Prevent modifying original
    var newOpts = utils.extend({}, opts);

    // Defaults for parameters which modify trail path
    if (!newOpts.trailColor) {
        newOpts.trailColor = '#eee';
    }
    if (!newOpts.trailWidth) {
        newOpts.trailWidth = newOpts.strokeWidth;
    }

    newOpts.color = newOpts.trailColor;
    newOpts.strokeWidth = newOpts.trailWidth;

    // When trail path is set, fill must be set for it instead of the
    // actual path to prevent trail stroke from clipping
    newOpts.fill = null;

    return this._createPathElement(pathString, newOpts);
};

Shape.prototype._createPathElement = function _createPathElement(pathString, opts) {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathString);
    path.setAttribute('stroke', opts.color);
    path.setAttribute('stroke-width', opts.strokeWidth);

    if (opts.fill) {
        path.setAttribute('fill', opts.fill);
    } else {
        path.setAttribute('fill-opacity', '0');
    }

    return path;
};

Shape.prototype._createTextContainer = function _createTextContainer(opts, container) {
    var textContainer = document.createElement('div');
    textContainer.className = opts.text.className;

    var textStyle = opts.text.style;
    if (textStyle) {
        if (opts.text.autoStyleContainer) {
            container.style.position = 'relative';
        }

        utils.setStyles(textContainer, textStyle);
        // Default text color to progress bar's color
        if (!textStyle.color) {
            textContainer.style.color = opts.color;
        }
    }

    this._initializeTextContainer(opts, container, textContainer);
    return textContainer;
};

// Give custom shapes possibility to modify text element
Shape.prototype._initializeTextContainer = function(opts, container, element) {
    // By default, no-op
    // Custom shapes should respect API options, such as text.style
};

Shape.prototype._pathString = function _pathString(opts) {
    throw new Error('Override this function for each progress bar');
};

Shape.prototype._trailString = function _trailString(opts) {
    throw new Error('Override this function for each progress bar');
};

Shape.prototype._warnContainerAspectRatio = function _warnContainerAspectRatio(container) {
    if (!this.containerAspectRatio) {
        return;
    }

    var computedStyle = window.getComputedStyle(container, null);
    var width = parseFloat(computedStyle.getPropertyValue('width'), 10);
    var height = parseFloat(computedStyle.getPropertyValue('height'), 10);
    if (!utils.floatEquals(this.containerAspectRatio, width / height)) {
        console.warn(
            'Incorrect aspect ratio of container',
            '#' + container.id,
            'detected:',
            computedStyle.getPropertyValue('width') + '(width)',
            '/',
            computedStyle.getPropertyValue('height') + '(height)',
            '=',
            width / height
        );

        console.warn(
            'Aspect ratio of should be',
            this.containerAspectRatio
        );
    }
};

module.exports = Shape;

},{"./path":7,"./utils":11}],10:[function(require,module,exports){
// Square shaped progress bar
// Note: Square is not core part of API anymore. It's left here
//       for reference. square is not included to the progressbar
//       build anymore

var Shape = require('./shape');
var utils = require('./utils');

var Square = function Square(container, options) {
    this._pathTemplate =
        'M 0,{halfOfStrokeWidth}' +
        ' L {width},{halfOfStrokeWidth}' +
        ' L {width},{width}' +
        ' L {halfOfStrokeWidth},{width}' +
        ' L {halfOfStrokeWidth},{strokeWidth}';

    this._trailTemplate =
        'M {startMargin},{halfOfStrokeWidth}' +
        ' L {width},{halfOfStrokeWidth}' +
        ' L {width},{width}' +
        ' L {halfOfStrokeWidth},{width}' +
        ' L {halfOfStrokeWidth},{halfOfStrokeWidth}';

    Shape.apply(this, arguments);
};

Square.prototype = new Shape();
Square.prototype.constructor = Square;

Square.prototype._pathString = function _pathString(opts) {
    var w = 100 - opts.strokeWidth / 2;

    return utils.render(this._pathTemplate, {
        width: w,
        strokeWidth: opts.strokeWidth,
        halfOfStrokeWidth: opts.strokeWidth / 2
    });
};

Square.prototype._trailString = function _trailString(opts) {
    var w = 100 - opts.strokeWidth / 2;

    return utils.render(this._trailTemplate, {
        width: w,
        strokeWidth: opts.strokeWidth,
        halfOfStrokeWidth: opts.strokeWidth / 2,
        startMargin: opts.strokeWidth / 2 - opts.trailWidth / 2
    });
};

module.exports = Square;

},{"./shape":9,"./utils":11}],11:[function(require,module,exports){
// Utility functions

var PREFIXES = 'Webkit Moz O ms'.split(' ');
var FLOAT_COMPARISON_EPSILON = 0.001;

// Copy all attributes from source object to destination object.
// destination object is mutated.
function extend(destination, source, recursive) {
    destination = destination || {};
    source = source || {};
    recursive = recursive || false;

    for (var attrName in source) {
        if (source.hasOwnProperty(attrName)) {
            var destVal = destination[attrName];
            var sourceVal = source[attrName];
            if (recursive && isObject(destVal) && isObject(sourceVal)) {
                destination[attrName] = extend(destVal, sourceVal, recursive);
            } else {
                destination[attrName] = sourceVal;
            }
        }
    }

    return destination;
}

// Renders templates with given variables. Variables must be surrounded with
// braces without any spaces, e.g. {variable}
// All instances of variable placeholders will be replaced with given content
// Example:
// render('Hello, {message}!', {message: 'world'})
function render(template, vars) {
    var rendered = template;

    for (var key in vars) {
        if (vars.hasOwnProperty(key)) {
            var val = vars[key];
            var regExpString = '\\{' + key + '\\}';
            var regExp = new RegExp(regExpString, 'g');

            rendered = rendered.replace(regExp, val);
        }
    }

    return rendered;
}

function setStyle(element, style, value) {
    var elStyle = element.style;  // cache for performance

    for (var i = 0; i < PREFIXES.length; ++i) {
        var prefix = PREFIXES[i];
        elStyle[prefix + capitalize(style)] = value;
    }

    elStyle[style] = value;
}

function setStyles(element, styles) {
    forEachObject(styles, function(styleValue, styleName) {
        // Allow disabling some individual styles by setting them
        // to null or undefined
        if (styleValue === null || styleValue === undefined) {
            return;
        }

        // If style's value is {prefix: true, value: '50%'},
        // Set also browser prefixed styles
        if (isObject(styleValue) && styleValue.prefix === true) {
            setStyle(element, styleName, styleValue.value);
        } else {
            element.style[styleName] = styleValue;
        }
    });
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function isString(obj) {
    return typeof obj === 'string' || obj instanceof String;
}

function isFunction(obj) {
    return typeof obj === 'function';
}

function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}

// Returns true if `obj` is object as in {a: 1, b: 2}, not if it's function or
// array
function isObject(obj) {
    if (isArray(obj)) {
        return false;
    }

    var type = typeof obj;
    return type === 'object' && !!obj;
}

function forEachObject(object, callback) {
    for (var key in object) {
        if (object.hasOwnProperty(key)) {
            var val = object[key];
            callback(val, key);
        }
    }
}

function floatEquals(a, b) {
    return Math.abs(a - b) < FLOAT_COMPARISON_EPSILON;
}

// https://coderwall.com/p/nygghw/don-t-use-innerhtml-to-empty-dom-elements
function removeChildren(el) {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

module.exports = {
    extend: extend,
    render: render,
    setStyle: setStyle,
    setStyles: setStyles,
    capitalize: capitalize,
    isString: isString,
    isFunction: isFunction,
    isObject: isObject,
    forEachObject: forEachObject,
    floatEquals: floatEquals,
    removeChildren: removeChildren
};

},{}],12:[function(require,module,exports){
/*! For license information please see shifty.js.LICENSE.txt */
!function(t,n){"object"==typeof exports&&"object"==typeof module?module.exports=n():"function"==typeof define&&define.amd?define("shifty",[],n):"object"==typeof exports?exports.shifty=n():t.shifty=n()}(self,(function(){return function(){"use strict";var t={720:function(t,n,e){e.r(n),e.d(n,{Scene:function(){return sn},Tweenable:function(){return kt},interpolate:function(){return nn},processTweens:function(){return dt},setBezierFunction:function(){return $},shouldScheduleUpdate:function(){return bt},tween:function(){return Pt},unsetBezierFunction:function(){return L}});var r={};e.r(r),e.d(r,{bounce:function(){return D},bouncePast:function(){return q},easeFrom:function(){return B},easeFromTo:function(){return Q},easeInBack:function(){return E},easeInCirc:function(){return j},easeInCubic:function(){return c},easeInExpo:function(){return w},easeInOutBack:function(){return T},easeInOutCirc:function(){return P},easeInOutCubic:function(){return l},easeInOutExpo:function(){return S},easeInOutQuad:function(){return s},easeInOutQuart:function(){return v},easeInOutQuint:function(){return d},easeInOutSine:function(){return b},easeInQuad:function(){return u},easeInQuart:function(){return h},easeInQuint:function(){return y},easeInSine:function(){return g},easeOutBack:function(){return A},easeOutBounce:function(){return M},easeOutCirc:function(){return k},easeOutCubic:function(){return f},easeOutExpo:function(){return O},easeOutQuad:function(){return a},easeOutQuart:function(){return p},easeOutQuint:function(){return _},easeOutSine:function(){return m},easeTo:function(){return N},elastic:function(){return I},linear:function(){return o},swingFrom:function(){return x},swingFromTo:function(){return F},swingTo:function(){return C}});var i={};e.r(i),e.d(i,{afterTween:function(){return Jt},beforeTween:function(){return Ht},doesApply:function(){return Wt},tweenCreated:function(){return Gt}});var o=function(t){return t},u=function(t){return Math.pow(t,2)},a=function(t){return-(Math.pow(t-1,2)-1)},s=function(t){return(t/=.5)<1?.5*Math.pow(t,2):-.5*((t-=2)*t-2)},c=function(t){return Math.pow(t,3)},f=function(t){return Math.pow(t-1,3)+1},l=function(t){return(t/=.5)<1?.5*Math.pow(t,3):.5*(Math.pow(t-2,3)+2)},h=function(t){return Math.pow(t,4)},p=function(t){return-(Math.pow(t-1,4)-1)},v=function(t){return(t/=.5)<1?.5*Math.pow(t,4):-.5*((t-=2)*Math.pow(t,3)-2)},y=function(t){return Math.pow(t,5)},_=function(t){return Math.pow(t-1,5)+1},d=function(t){return(t/=.5)<1?.5*Math.pow(t,5):.5*(Math.pow(t-2,5)+2)},g=function(t){return 1-Math.cos(t*(Math.PI/2))},m=function(t){return Math.sin(t*(Math.PI/2))},b=function(t){return-.5*(Math.cos(Math.PI*t)-1)},w=function(t){return 0===t?0:Math.pow(2,10*(t-1))},O=function(t){return 1===t?1:1-Math.pow(2,-10*t)},S=function(t){return 0===t?0:1===t?1:(t/=.5)<1?.5*Math.pow(2,10*(t-1)):.5*(2-Math.pow(2,-10*--t))},j=function(t){return-(Math.sqrt(1-t*t)-1)},k=function(t){return Math.sqrt(1-Math.pow(t-1,2))},P=function(t){return(t/=.5)<1?-.5*(Math.sqrt(1-t*t)-1):.5*(Math.sqrt(1-(t-=2)*t)+1)},M=function(t){return t<1/2.75?7.5625*t*t:t<2/2.75?7.5625*(t-=1.5/2.75)*t+.75:t<2.5/2.75?7.5625*(t-=2.25/2.75)*t+.9375:7.5625*(t-=2.625/2.75)*t+.984375},E=function(t){var n=1.70158;return t*t*((n+1)*t-n)},A=function(t){var n=1.70158;return(t-=1)*t*((n+1)*t+n)+1},T=function(t){var n=1.70158;return(t/=.5)<1?t*t*((1+(n*=1.525))*t-n)*.5:.5*((t-=2)*t*((1+(n*=1.525))*t+n)+2)},I=function(t){return-1*Math.pow(4,-8*t)*Math.sin((6*t-1)*(2*Math.PI)/2)+1},F=function(t){var n=1.70158;return(t/=.5)<1?t*t*((1+(n*=1.525))*t-n)*.5:.5*((t-=2)*t*((1+(n*=1.525))*t+n)+2)},x=function(t){var n=1.70158;return t*t*((n+1)*t-n)},C=function(t){var n=1.70158;return(t-=1)*t*((n+1)*t+n)+1},D=function(t){return t<1/2.75?7.5625*t*t:t<2/2.75?7.5625*(t-=1.5/2.75)*t+.75:t<2.5/2.75?7.5625*(t-=2.25/2.75)*t+.9375:7.5625*(t-=2.625/2.75)*t+.984375},q=function(t){return t<1/2.75?7.5625*t*t:t<2/2.75?2-(7.5625*(t-=1.5/2.75)*t+.75):t<2.5/2.75?2-(7.5625*(t-=2.25/2.75)*t+.9375):2-(7.5625*(t-=2.625/2.75)*t+.984375)},Q=function(t){return(t/=.5)<1?.5*Math.pow(t,4):-.5*((t-=2)*Math.pow(t,3)-2)},B=function(t){return Math.pow(t,4)},N=function(t){return Math.pow(t,.25)};function R(t,n,e,r,i,o){var u,a,s,c,f,l=0,h=0,p=0,v=function(t){return((l*t+h)*t+p)*t},y=function(t){return(3*l*t+2*h)*t+p},_=function(t){return t>=0?t:0-t};return l=1-(p=3*n)-(h=3*(r-n)-p),s=1-(f=3*e)-(c=3*(i-e)-f),u=t,a=function(t){return 1/(200*t)}(o),function(t){return((s*t+c)*t+f)*t}(function(t,n){var e,r,i,o,u,a;for(i=t,a=0;a<8;a++){if(o=v(i)-t,_(o)<n)return i;if(u=y(i),_(u)<1e-6)break;i-=o/u}if((i=t)<(e=0))return e;if(i>(r=1))return r;for(;e<r;){if(o=v(i),_(o-t)<n)return i;t>o?e=i:r=i,i=.5*(r-e)+e}return i}(u,a))}var z,U=function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:.25,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:.25,e=arguments.length>2&&void 0!==arguments[2]?arguments[2]:.75,r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:.75;return function(i){return R(i,t,n,e,r,1)}},$=function(t,n,e,r,i){var o=U(n,e,r,i);return o.displayName=t,o.x1=n,o.y1=e,o.x2=r,o.y2=i,kt.formulas[t]=o},L=function(t){return delete kt.formulas[t]};function V(t,n){if(!(t instanceof n))throw new TypeError("Cannot call a class as a function")}function W(t,n){for(var e=0;e<n.length;e++){var r=n[e];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function G(t){return G="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},G(t)}function H(t){return function(t){if(Array.isArray(t))return J(t)}(t)||function(t){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(t))return Array.from(t)}(t)||function(t,n){if(t){if("string"==typeof t)return J(t,n);var e=Object.prototype.toString.call(t).slice(8,-1);return"Object"===e&&t.constructor&&(e=t.constructor.name),"Map"===e||"Set"===e?Array.from(t):"Arguments"===e||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?J(t,n):void 0}}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function J(t,n){(null==n||n>t.length)&&(n=t.length);for(var e=0,r=new Array(n);e<n;e++)r[e]=t[e];return r}function K(t,n){var e=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(t,n).enumerable}))),e.push.apply(e,r)}return e}function X(t){for(var n=1;n<arguments.length;n++){var e=null!=arguments[n]?arguments[n]:{};n%2?K(Object(e),!0).forEach((function(n){Y(t,n,e[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):K(Object(e)).forEach((function(n){Object.defineProperty(t,n,Object.getOwnPropertyDescriptor(e,n))}))}return t}function Y(t,n,e){return n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e,t}var Z,tt,nt,et="linear",rt="undefined"!=typeof window?window:e.g,it="afterTween",ot="afterTweenEnd",ut="beforeTween",at="tweenCreated",st="function",ct="string",ft=rt.requestAnimationFrame||rt.webkitRequestAnimationFrame||rt.oRequestAnimationFrame||rt.msRequestAnimationFrame||rt.mozCancelRequestAnimationFrame&&rt.mozRequestAnimationFrame||setTimeout,lt=function(){},ht=null,pt=null,vt=X({},r),yt=function(t,n,e,r,i,o,u){var a,s,c,f=t<o?0:(t-o)/i,l=!1;for(var h in u&&u.call&&(l=!0,a=u(f)),n)l||(a=((s=u[h]).call?s:vt[s])(f)),c=e[h],n[h]=c+(r[h]-c)*a;return n},_t=function(t,n){var e=t._timestamp,r=t._currentState,i=t._delay;if(!(n<e+i)){var o=t._duration,u=t._targetState,a=e+i+o,s=n>a?a:n;t._hasEnded=s>=a;var c=o-(a-s),f=t._filters.length>0;if(t._hasEnded)return t._render(u,t._data,c),t.stop(!0);f&&t._applyFilter(ut),s<e+i?e=o=s=1:e+=i,yt(s,r,t._originalState,u,o,e,t._easing),f&&t._applyFilter(it),t._render(r,t._data,c)}},dt=function(){for(var t,n=kt.now(),e=ht;e;)t=e._next,_t(e,n),e=t},gt=Date.now||function(){return+new Date},mt=!1,bt=function(t){t&&mt||(mt=t,t&&wt())},wt=function t(){Z=gt(),mt&&ft.call(rt,t,16.666666666666668),dt()},Ot=function(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:et,e=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};if(Array.isArray(n)){var r=U.apply(void 0,H(n));return r}var i=G(n);if(vt[n])return vt[n];if(i===ct||i===st)for(var o in t)e[o]=n;else for(var u in t)e[u]=n[u]||et;return e},St=function(t){t===ht?(ht=t._next)?ht._previous=null:pt=null:t===pt?(pt=t._previous)?pt._next=null:ht=null:(tt=t._previous,nt=t._next,tt._next=nt,nt._previous=tt),t._previous=t._next=null},jt="function"==typeof Promise?Promise:null;z=Symbol.toStringTag;var kt=function(){function t(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:void 0;V(this,t),Y(this,z,"Promise"),this._config={},this._data={},this._delay=0,this._filters=[],this._next=null,this._previous=null,this._timestamp=null,this._hasEnded=!1,this._resolve=null,this._reject=null,this._currentState=n||{},this._originalState={},this._targetState={},this._start=lt,this._render=lt,this._promiseCtor=jt,e&&this.setConfig(e)}var n,e;return n=t,e=[{key:"_applyFilter",value:function(t){for(var n=this._filters.length;n>0;n--){var e=this._filters[n-n][t];e&&e(this)}}},{key:"tween",value:function(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:void 0;return this._isPlaying&&this.stop(),!n&&this._config||this.setConfig(n),this._pausedAtTime=null,this._timestamp=t.now(),this._start(this.get(),this._data),this._delay&&this._render(this._currentState,this._data,0),this._resume(this._timestamp)}},{key:"setConfig",value:function(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},e=this._config;for(var r in n)e[r]=n[r];var i=e.promise,o=void 0===i?this._promiseCtor:i,u=e.start,a=void 0===u?lt:u,s=e.finish,c=e.render,f=void 0===c?this._config.step||lt:c,l=e.step,h=void 0===l?lt:l;this._data=e.data||e.attachment||this._data,this._isPlaying=!1,this._pausedAtTime=null,this._scheduleId=null,this._delay=n.delay||0,this._start=a,this._render=f||h,this._duration=e.duration||500,this._promiseCtor=o,s&&(this._resolve=s);var p=n.from,v=n.to,y=void 0===v?{}:v,_=this._currentState,d=this._originalState,g=this._targetState;for(var m in p)_[m]=p[m];var b=!1;for(var w in _){var O=_[w];b||G(O)!==ct||(b=!0),d[w]=O,g[w]=y.hasOwnProperty(w)?y[w]:O}if(this._easing=Ot(this._currentState,e.easing,this._easing),this._filters.length=0,b){for(var S in t.filters)t.filters[S].doesApply(this)&&this._filters.push(t.filters[S]);this._applyFilter(at)}return this}},{key:"then",value:function(t,n){var e=this;return this._promise=new this._promiseCtor((function(t,n){e._resolve=t,e._reject=n})),this._promise.then(t,n)}},{key:"catch",value:function(t){return this.then().catch(t)}},{key:"finally",value:function(t){return this.then().finally(t)}},{key:"get",value:function(){return X({},this._currentState)}},{key:"set",value:function(t){this._currentState=t}},{key:"pause",value:function(){if(this._isPlaying)return this._pausedAtTime=t.now(),this._isPlaying=!1,St(this),this}},{key:"resume",value:function(){return this._resume()}},{key:"_resume",value:function(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:t.now();return null===this._timestamp?this.tween():this._isPlaying?this._promise:(this._pausedAtTime&&(this._timestamp+=n-this._pausedAtTime,this._pausedAtTime=null),this._isPlaying=!0,null===ht?(ht=this,pt=this):(this._previous=pt,pt._next=this,pt=this),this)}},{key:"seek",value:function(n){n=Math.max(n,0);var e=t.now();return this._timestamp+n===0||(this._timestamp=e-n,_t(this,e)),this}},{key:"stop",value:function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];if(!this._isPlaying)return this;this._isPlaying=!1,St(this);var n=this._filters.length>0;return t&&(n&&this._applyFilter(ut),yt(1,this._currentState,this._originalState,this._targetState,1,0,this._easing),n&&(this._applyFilter(it),this._applyFilter(ot))),this._resolve&&this._resolve({data:this._data,state:this._currentState,tweenable:this}),this._resolve=null,this._reject=null,this}},{key:"cancel",value:function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0],n=this._currentState,e=this._data,r=this._isPlaying;return r?(this._reject&&this._reject({data:e,state:n,tweenable:this}),this._resolve=null,this._reject=null,this.stop(t)):this}},{key:"isPlaying",value:function(){return this._isPlaying}},{key:"hasEnded",value:function(){return this._hasEnded}},{key:"setScheduleFunction",value:function(n){t.setScheduleFunction(n)}},{key:"data",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:null;return t&&(this._data=X({},t)),this._data}},{key:"dispose",value:function(){for(var t in this)delete this[t]}}],e&&W(n.prototype,e),t}();function Pt(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=new kt;return n.tween(t),n.tweenable=n,n}Y(kt,"now",(function(){return Z})),Y(kt,"setScheduleFunction",(function(t){return ft=t})),Y(kt,"filters",{}),Y(kt,"formulas",vt),bt(!0);var Mt,Et,At=/(\d|-|\.)/,Tt=/([^\-0-9.]+)/g,It=/[0-9.-]+/g,Ft=(Mt=It.source,Et=/,\s*/.source,new RegExp("rgba?\\(".concat(Mt).concat(Et).concat(Mt).concat(Et).concat(Mt,"(").concat(Et).concat(Mt,")?\\)"),"g")),xt=/^.*\(/,Ct=/#([0-9]|[a-f]){3,6}/gi,Dt="VAL",qt=function(t,n){return t.map((function(t,e){return"_".concat(n,"_").concat(e)}))};function Qt(t){return parseInt(t,16)}var Bt=function(t){return"rgb(".concat((n=t,3===(n=n.replace(/#/,"")).length&&(n=(n=n.split(""))[0]+n[0]+n[1]+n[1]+n[2]+n[2]),[Qt(n.substr(0,2)),Qt(n.substr(2,2)),Qt(n.substr(4,2))]).join(","),")");var n},Nt=function(t,n,e){var r=n.match(t),i=n.replace(t,Dt);return r&&r.forEach((function(t){return i=i.replace(Dt,e(t))})),i},Rt=function(t){for(var n in t){var e=t[n];"string"==typeof e&&e.match(Ct)&&(t[n]=Nt(Ct,e,Bt))}},zt=function(t){var n=t.match(It),e=n.slice(0,3).map(Math.floor),r=t.match(xt)[0];if(3===n.length)return"".concat(r).concat(e.join(","),")");if(4===n.length)return"".concat(r).concat(e.join(","),",").concat(n[3],")");throw new Error("Invalid rgbChunk: ".concat(t))},Ut=function(t){return t.match(It)},$t=function(t,n){var e={};return n.forEach((function(n){e[n]=t[n],delete t[n]})),e},Lt=function(t,n){return n.map((function(n){return t[n]}))},Vt=function(t,n){return n.forEach((function(n){return t=t.replace(Dt,+n.toFixed(4))})),t},Wt=function(t){for(var n in t._currentState)if("string"==typeof t._currentState[n])return!0;return!1};function Gt(t){var n=t._currentState;[n,t._originalState,t._targetState].forEach(Rt),t._tokenData=function(t){var n,e,r={};for(var i in t){var o=t[i];"string"==typeof o&&(r[i]={formatString:(n=o,e=void 0,e=n.match(Tt),e?(1===e.length||n.charAt(0).match(At))&&e.unshift(""):e=["",""],e.join(Dt)),chunkNames:qt(Ut(o),i)})}return r}(n)}function Ht(t){var n=t._currentState,e=t._originalState,r=t._targetState,i=t._easing,o=t._tokenData;!function(t,n){var e=function(e){var r=n[e].chunkNames,i=t[e];if("string"==typeof i){var o=i.split(" "),u=o[o.length-1];r.forEach((function(n,e){return t[n]=o[e]||u}))}else r.forEach((function(n){return t[n]=i}));delete t[e]};for(var r in n)e(r)}(i,o),[n,e,r].forEach((function(t){return function(t,n){var e=function(e){Ut(t[e]).forEach((function(r,i){return t[n[e].chunkNames[i]]=+r})),delete t[e]};for(var r in n)e(r)}(t,o)}))}function Jt(t){var n=t._currentState,e=t._originalState,r=t._targetState,i=t._easing,o=t._tokenData;[n,e,r].forEach((function(t){return function(t,n){for(var e in n){var r=n[e],i=r.chunkNames,o=r.formatString,u=Vt(o,Lt($t(t,i),i));t[e]=Nt(Ft,u,zt)}}(t,o)})),function(t,n){for(var e in n){var r=n[e].chunkNames,i=t[r[0]];t[e]="string"==typeof i?r.map((function(n){var e=t[n];return delete t[n],e})).join(" "):i}}(i,o)}function Kt(t,n){var e=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(t,n).enumerable}))),e.push.apply(e,r)}return e}function Xt(t){for(var n=1;n<arguments.length;n++){var e=null!=arguments[n]?arguments[n]:{};n%2?Kt(Object(e),!0).forEach((function(n){Yt(t,n,e[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):Kt(Object(e)).forEach((function(n){Object.defineProperty(t,n,Object.getOwnPropertyDescriptor(e,n))}))}return t}function Yt(t,n,e){return n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e,t}var Zt=new kt,tn=kt.filters,nn=function(t,n,e,r){var i=arguments.length>4&&void 0!==arguments[4]?arguments[4]:0,o=Xt({},t),u=Ot(t,r);for(var a in Zt._filters.length=0,Zt.set({}),Zt._currentState=o,Zt._originalState=t,Zt._targetState=n,Zt._easing=u,tn)tn[a].doesApply(Zt)&&Zt._filters.push(tn[a]);Zt._applyFilter("tweenCreated"),Zt._applyFilter("beforeTween");var s=yt(e,o,t,n,1,i,u);return Zt._applyFilter("afterTween"),s};function en(t,n){(null==n||n>t.length)&&(n=t.length);for(var e=0,r=new Array(n);e<n;e++)r[e]=t[e];return r}function rn(t,n){if(!(t instanceof n))throw new TypeError("Cannot call a class as a function")}function on(t,n){for(var e=0;e<n.length;e++){var r=n[e];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function un(t,n){var e=n.get(t);if(!e)throw new TypeError("attempted to get private field on non-instance");return e.get?e.get.call(t):e.value}var an=new WeakMap,sn=function(){function t(){rn(this,t),an.set(this,{writable:!0,value:[]});for(var n=arguments.length,e=new Array(n),r=0;r<n;r++)e[r]=arguments[r];e.forEach(this.add.bind(this))}var n,e;return n=t,(e=[{key:"add",value:function(t){return un(this,an).push(t),t}},{key:"remove",value:function(t){var n=un(this,an).indexOf(t);return~n&&un(this,an).splice(n,1),t}},{key:"empty",value:function(){return this.tweenables.map(this.remove.bind(this))}},{key:"isPlaying",value:function(){return un(this,an).some((function(t){return t.isPlaying()}))}},{key:"play",value:function(){return un(this,an).forEach((function(t){return t.tween()})),this}},{key:"pause",value:function(){return un(this,an).forEach((function(t){return t.pause()})),this}},{key:"resume",value:function(){return this.playingTweenables.forEach((function(t){return t.resume()})),this}},{key:"stop",value:function(t){return un(this,an).forEach((function(n){return n.stop(t)})),this}},{key:"tweenables",get:function(){return function(t){if(Array.isArray(t))return en(t)}(t=un(this,an))||function(t){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(t))return Array.from(t)}(t)||function(t,n){if(t){if("string"==typeof t)return en(t,n);var e=Object.prototype.toString.call(t).slice(8,-1);return"Object"===e&&t.constructor&&(e=t.constructor.name),"Map"===e||"Set"===e?Array.from(t):"Arguments"===e||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(e)?en(t,n):void 0}}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}();var t}},{key:"playingTweenables",get:function(){return un(this,an).filter((function(t){return!t.hasEnded()}))}},{key:"promises",get:function(){return un(this,an).map((function(t){return t.then()}))}}])&&on(n.prototype,e),t}();kt.filters.token=i}},n={};function e(r){if(n[r])return n[r].exports;var i=n[r]={exports:{}};return t[r](i,i.exports,e),i.exports}return e.d=function(t,n){for(var r in n)e.o(n,r)&&!e.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:n[r]})},e.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(t){if("object"==typeof window)return window}}(),e.o=function(t,n){return Object.prototype.hasOwnProperty.call(t,n)},e.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},e(720)}()}));

},{}],13:[function(require,module,exports){
const { RTCServer } = require('./src/RTCServer');
const { RTCClient } = require('./src/RTCClient');
module.exports.RTCServer = RTCServer;
module.exports.RTCClient = RTCClient;
},{"./src/RTCClient":15,"./src/RTCServer":16}],14:[function(require,module,exports){
'use strict';

exports.MediaStream = window.MediaStream;
exports.RTCIceCandidate = window.RTCIceCandidate;
exports.RTCPeerConnection = window.RTCPeerConnection;
exports.RTCSessionDescription = window.RTCSessionDescription;

},{}],15:[function(require,module,exports){
const { getOffer, onCandidate, Rtcpc } = require("./common");

async function ClientRecieveOffer(pc, ws) {
    try {
        console.log("waiting for offer");
        const offer = await getOffer(ws);
        console.log("recieved offer");
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await ws.send(JSON.stringify(answer));
        console.log("sendt reply");
    } catch (error) {
        console.error(error.stack || error.message || error);
        ws.close();
    }
}

/**
 * Creates the client side.
 */
module.exports.RTCClient = class RtcpcClient extends Rtcpc {
    /**
     * Creates the client side.
     * @param {WebSocket} ws 
     * @param {RTCConfiguration} config
     * @param {[config]} datachannels
     */
    constructor(ws, config, datachannels) {
        super(ws, config, datachannels);
    }

    /**
     * Waits for server to send candidate, handshakes, and awaits all datachannels to become active.
     */
    async create() {
        onCandidate(this.ws, async candidate => {
            console.log("got a candidate");
            if (!this.pc.remoteDescription) {
                this.queuedCandidates.push(candidate);
                return;
            }
            await this.pc.addIceCandidate(candidate);
        }
        );
        await ClientRecieveOffer(this.pc, this.ws);
        await Promise.all(this.queuedCandidates.splice(0).map(async candidate => {
            console.log("resolving candidates");
            await this.pc.addIceCandidate(candidate);
        }));
        await Promise.all(this.openPromises);
        console.log("Datachannels opened");
    }
}
},{"./common":17}],16:[function(require,module,exports){
const { getAnswer, onCandidate, Rtcpc } =require('./common');
const { RTCPeerConnection } = require('wrtc');

/**
 * Creates an RTCPeerConnection Offer.
 * Sends the offer to websocket connection, and awaits answer.
 * @param {RTCPeerConnection} pc 
 * @param {WebSocket} ws 
 */
async function ServerCreateOffer(pc, ws) {
    try {
        var offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await ws.send(JSON.stringify(offer));
        var answer = await getAnswer(ws);
        await pc.setRemoteDescription(answer);
    } catch (error) {
        console.error(error.stack || error.message || error);
        ws.close();
    }
}

/**
 * Creates Server Side RTCPeerConnection.
 */
module.exports.RTCServer = class RtcpcServer extends Rtcpc {
    /**
     * Constructor. Adds Datachannels.
     * @param {WebSocket} ws 
     * @param {RTCConfiguration} config
     * @param {[{"label":String, config: { ordered: Boolean, maxRetransmits: Uint32Array, binaryType: "blob || arraybuffer"}}]} datachannels
     */
    constructor(ws, config, datachannels) {
        super(ws, config, datachannels);
    }
    /**
     * Handles handshaking and awaits all the datachannels to open.
     */
    async create () {
        onCandidate(this.ws, async candidate => {
            console.log("got a candidate");
            if (!this.pc.remoteDescription) {
                this.queuedCandidates.push(candidate);
                return;
            }
            await this.pc.addIceCandidate(candidate);
        }
        );
        console.log("initiating handshake");
        await ServerCreateOffer(this.pc, this.ws);
        await Promise.all(this.queuedCandidates.splice(0).map(async candidate => {
            console.log("resolving candidates");
            await this.pc.addIceCandidate(candidate);
        }));
        await Promise.all(this.openPromises);
    }
}
},{"./common":17,"wrtc":14}],17:[function(require,module,exports){
'use strict';

const {
  RTCIceCandidate,
  RTCSessionDescription,
  RTCPeerConnection
} = require('wrtc');

/**
 * Creates a new RTCPeerConnection, negotiates tcp and udp channels.
 * make = new Rtcpc(ws); await make.create();"
 */
module.exports.Rtcpc = class Rtcpc {
  /**
   * Creates a new instance and initializes the RTCPeerConnection.
   * @param {WebSocket} ws 
   * @param {RTCConfiguration} config
   */
  constructor(ws, config, datachannels) {
    this.isReady = false;
    /**
     * @type {RTCPeerConnection}
     */
    this.pc = new RTCPeerConnection(config);
    this.ws = ws;
    this.queuedCandidates = [];
    this.datachannels = datachannels;
    this.openPromises = [];
    let id=0;
    this.datachannels.forEach(element => {
      id++;
      element.config.id=id;
      element.config.negotiated=true;
      element.onOpenResolve = () => { };
      element.onOpenReject = () => { };
      element.onOpenPromise = new Promise((resolve, reject) => {
        element.onOpenResolve = resolve;
        element.onOpenReject = reject;
      });
      this.openPromises.push(element.onOpenPromise);
      this[element.label] = this.pc.createDataChannel(element.label, element.config);
      this[element.label].onopen = element.onOpenResolve;
    });
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        ws.send(JSON.stringify({
          type: 'candidate',
          candidate
        }));
      }
    };
  }
}

function getMessage(ws, type) {
  return new Promise((resolve, reject) => {
    function onMessage({ data }) {
      try {
        const message = JSON.parse(data);
        if (message.type === type) {
          resolve(message);
        }
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    }

    function onClose() {
      reject(new Error('WebSocket closed'));
      cleanup();
    }

    function cleanup() {
      ws.removeEventListener('message', onMessage);
      ws.removeEventListener('close', onClose);
    }

    ws.addEventListener('message', onMessage);
    ws.addEventListener('close', onClose);
  });
}

module.exports.getOffer = async function getOffer(ws) {
  const offer = await getMessage(ws, 'offer');
  return new RTCSessionDescription(offer);
}

module.exports.getAnswer = async function getAnswer(ws) {
  const answer = await getMessage(ws, 'answer');
  return new RTCSessionDescription(answer);
}

module.exports.onCandidate = function onCandidate(ws, callback) {
  ws.addEventListener('message', ({ data }) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'candidate') {
        const candidate = new RTCIceCandidate(message.candidate);
        callback(candidate);
        return;
      }
    } catch (error) {
      // Do nothing.
    }
  });
}
},{"wrtc":14}],18:[function(require,module,exports){
module.exports.rtcConfig = {
  RTCPeerConnectionConf: { 
    required: {
      video: false,
      audio: false
    },
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    optional: [
      { DtlsSrtpKeyAgreement: true },
      { RtpDataChannels: true }] //Apparently this may make firefox compatible.
  },
  datachannels:
  [{
    label: "tcp",
    config: {
      ordered: true,
      maxRetransmits: 10,
      binaryType: "blob"
    }
  },{
    label: "udp",
    config: {
      ordered: false,
      maxRetransmits: 0,
      binaryType: "blob"
    }
  }]
}
},{}],19:[function(require,module,exports){
/**
 * ui.js
 * This file will handle all the UI-related functions and DOM manipulations.
 */

var ProgressBar = require("progressbar.js");
const global_state = require('./global-state');
const helper = require('./helper');
/**
 * Updates the output values displayed on the UI.
 */
function updateOutput() {
    var val1 = document.getElementById("val1");
    var val2 = document.getElementById("val2");
    var val3 = document.getElementById("val3");

    val1.style.color = "white";
    val2.style.color = "white";
    val3.style.color = "white";
    val4.style.color = "white";

    var latencyResult = helper.latencyCalc();
    var jitterResult = helper.jitterCalc();
    var latePacketResult = helper.latePacketCalc();

    // commented due to change to resultBar
    // val1.innerHTML = latencyResult[0].toFixed(1);
    // val2.innerHTML = latencyResult[1].toFixed(1);
    val1.innerHTML = String(parseInt(latePacketResult));
    percHTML = '<span id="percSymbol">%</span>';
    val1.insertAdjacentHTML("beforeend", percHTML);
    val2.innerHTML = String(parseInt(global_state.packet_loss));
    val2.insertAdjacentHTML("beforeend", percHTML);
    val3.innerHTML = Math.round(latencyResult[2].toFixed(1));
    val4.innerHTML = parseInt(jitterResult);
}

/**
 * Updates the result display with the given values.
 * @param {number} x - The x value.
 * @param {number} y - The y value.
 */
function updateResult(x, y) {
    var freqResult = document.getElementById("endResult2num");
    var durResult = document.getElementById("endResult3num");

    freqResult.innerHTML = x;
    durResult.innerHTML = y;
}

/**
* Disables the output display.
*/
function disableOutput() {
    document.getElementById("val1").style.color = "#b3e5fc";
    document.getElementById("val2").style.color = "#b3e5fc";
    document.getElementById("val3").style.color = "#b3e5fc";
    document.getElementById("val4").style.color = "#b3e5fc";
}


/**
 * Increments the badge count.
 */
function incrementBadge() {
    var count = document.getElementById("counterbar1");
    var number = count.innerHTML;
    number++;
    count.innerHTML = number;
}

/**
* Increments the second badge count.
*/
function incrementBadge2() {
    var count = document.getElementById("counterbar2");
    var number = count.innerHTML;
    number++;
    count.innerHTML = number;
}

/**
* Clears all badge counts.
*/
function clearBadges() {
    var badge_1 = document.getElementById("counterbar1");
    var badge_2 = document.getElementById("counterbar2");
    badge_1.innerHTML = 0;
    badge_2.innerHTML = 0;
}


/**
* Fades out an HTML element by gradually changing its opacity to 0 over a specified duration.
*
* @param {HTMLElement} el - The HTML element to fade out.
* @param {number} speed - The duration of the fade-out effect in milliseconds.
*/
function fadeOut(el, speed) {
    var seconds = speed / 1000;
    var old_tran = el.style.transition;
    el.style.transition = "opacity " + seconds + "s ease";
    el.style.opacity = 0;
    setTimeout(function () {
        el.style.transition = old_tran;
    }, 500);
}


/**
* Fades in an element by gradually changing its opacity to 1 over a specified duration.
*
* @param {HTMLElement} el - The element to fade in.
* @param {number} speed - The duration of the fade-in effect in milliseconds.
*/
function fadeIn(el, speed) {
    var seconds = speed / 1000;
    var old_tran = el.style.transition;
    el.style.transition = "opacity " + seconds + "s ease";
    el.style.opacity = 1;
    setTimeout(function () {
        el.style.transition = old_tran;
    }, 500);
}

/**
 * Swaps the content of two HTML elements by cloning the content of the second element
 * and replacing the content of the first element with the cloned content.
 *
 * @param {string} x - The ID of the element whose content will be replaced.
 * @param {string} y - The ID of the element whose content will be cloned.
 */
function swapContent(x, y) {
    const main = document.getElementById(x);
    const div = document.getElementById(y);
    const clone = div.cloneNode(true);

    while (main.firstChild) main.firstChild.remove();

    main.appendChild(clone);
}

var bar = new ProgressBar.Circle(progbar1, {
    color: "#e8eddf",
    // This has to be the same size as the maximum width to
    // prevent clipping
    strokeWidth: 4,
    trailWidth: 0,
    trailColor: "#000B23",
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
  
  /**
   * Progress bar 2
   */
  var bar2 = new ProgressBar.Circle(progbar2, {
    color: "#e8eddf",
    // This has to be the same size as the maximum width to
    // prevent clipping
    strokeWidth: 4,
    trailWidth: 0,
    trailColor: "#000B23",
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
  

/**
* Updates the progress bar with the specified percentage.
*/
function updateBar1() {
    bar.animate(global_state.sentPerc);
}


/**
* Updates the progress of bar2 by animating it to the specified percentage.
*/
function updateBar2() {
    bar2.animate(global_state.recPerc);
}


/**
 * Controls the test button behavior.
 * @param {string} btn - The button selector.
 * @param {string} df - The default button ID.
 * @param {string} type - The type of control.
 */
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
            var new_val = num.replace(/[^\d]/g, "");
            this.classList.add("active");
            active_button = this;
            //console.log(new_val);
            if (type == "freq") {
                helper.setFreq(new_val);
                console.log('Frequency set to:', global_state.freq, 'new_val:', new_val);
            } else if (type == "dur") {
                helper.setDur(new_val);
            } else if (type == "delay") {
                helper.setAccDelay(new_val);
            }
        });
    }
}


module.exports = {
    bar,
    bar2,
    updateOutput,
    updateResult,
    disableOutput,
    incrementBadge,
    incrementBadge2,
    clearBadges,
    fadeOut,
    fadeIn,
    swapContent,
    updateBar1,
    updateBar2,
    tbController
};
},{"./global-state":2,"./helper":3,"progressbar.js":6}],20:[function(require,module,exports){
/**
 * webrtc-client.js
 * Runs a WebRTC client that handles WebSocket connections, sends and receives data, measures latency, and updates the user interface accordingly.
 */

async function onOpen(ws) {
    return new Promise((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onclose = () => reject(new Error("WebSocket closed"));
    });
}
module.exports = { onOpen };


},{}]},{},[1]);
