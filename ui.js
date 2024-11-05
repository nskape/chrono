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
            if (type == "freq") {
                helper.setFreq(new_val);
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