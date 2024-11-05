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