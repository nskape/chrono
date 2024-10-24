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
    const ws = new WebSocket("ws://" + "3.131.138.200" + ":8080");
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

/**
 * Handles the WebSocket open event.
 * @param {WebSocket} ws - The WebSocket instance.
 * @returns {Promise} - Resolves when the WebSocket is open, rejects if closed.
 */
async function onOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onclose = () => reject(new Error("WebSocket closed"));
  });
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

/**
 * Calculates the latency values (min, max, avg) from the latencyValues array.
 * @returns {Array} - An array containing min, max, and avg latency values.
 */
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


/**
 * Calculates the jitter value across all packet latency values.
 * @returns {number} - The jitter value.
 */
function jitterCalc() {
  arr = latencyValues;
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
  var packetLossResult = packet_loss;

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
 * Sets the frequency value.
 * @param {number} val - The frequency value.
 */
function setFreq(val) {
  freq = val;
}

/**
 * Gets the frequency value.
 * @returns {number} - The frequency value.
 */
function getFreq() {
  return freq;
}

/**
 * Sets the duration value.
 * @param {number} val - The duration value.
 */
function setDur(val) {
  duration = val;
}

/**
 * Gets the duration value.
 * @returns {number} - The duration value.
 */
function getDur() {
  return duration;
}

/**
 * Sets the acceptable delay value.
 * @param {number} val - The acceptable delay value.
 */
function setAccDelay(val) {
  acc_delay = val;
}

/**
 * Gets the acceptable delay value.
 * @returns {number} - The acceptable delay value.
 */
function getAccDelay() {
  return acc_delay;
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

/**
 * Progress bar 1
 */
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
  bar.animate(sentPerc);
}

/**
 * Updates the progress of bar2 by animating it to the specified percentage.
 */
function updateBar2() {
  bar2.animate(recPerc);
}

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
