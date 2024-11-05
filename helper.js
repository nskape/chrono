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