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
