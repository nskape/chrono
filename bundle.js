(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { RTCClient } = require("webrtc-server-client-datachannel");
const { rtcConfig } = require("./rtc.config");
//const WebSocket = require('ws');

async function main() {
  try {
    const old_interval = 1000; // 1 second as a standard interval
    var old_freq = 10; // amount of packets in one interval
    var old_duration = 5000; // duration of test (x amount of pings * duration = net pings)  -- this adjusts duration this runs

    const interval = 1000; // 1 second as a standard interval
    var freq = getFreqValue();
    var duration = getDurValue();

    console.log("opening websocket");
    const ws = new WebSocket("ws://" + "localhost" + ":8080");
    await onOpen(ws);

    let pc = new RTCClient(
      ws,
      rtcConfig.RTCPeerConnectionConf,
      rtcConfig.datachannels
    );
    await pc.create();

    // Check
    // pc.udp.send("AllReadyFromUDP");
    // When message received from server
    // pc.udp.onmessage = (event)=>{
    //   console.log("Received UDP packet | Data:", event.data);
    // };

    // Send UDP packet to server within interval
    packetSender = setInterval(() => {
      for (var i = 0; i < freq; i++) {
        pc.udp.send("Hello from client UDP"); // send packet
        incrementBadge();
        console.log("* Sent UDP packet");
      }
    }, interval);
  } catch (error) {
    console.log(error);
  }

  // Stop sending UDP packets within duration
  // setTimeout(() => { clearInterval(packetSender); alert('stop'); }, duration);
  setTimeout(() => {
    clearInterval(packetSender);
  }, duration);
}

async function onOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onclose = () => reject(new Error("WebSocket closed"));
  });
}

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

},{"./rtc.config":7,"webrtc-server-client-datachannel":2}],2:[function(require,module,exports){
const { RTCServer } = require('./src/RTCServer');
const { RTCClient } = require('./src/RTCClient');
module.exports.RTCServer = RTCServer;
module.exports.RTCClient = RTCClient;
},{"./src/RTCClient":4,"./src/RTCServer":5}],3:[function(require,module,exports){
'use strict';

exports.MediaStream = window.MediaStream;
exports.RTCIceCandidate = window.RTCIceCandidate;
exports.RTCPeerConnection = window.RTCPeerConnection;
exports.RTCSessionDescription = window.RTCSessionDescription;

},{}],4:[function(require,module,exports){
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
        console.log("send reply");
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
},{"./common":6}],5:[function(require,module,exports){
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
},{"./common":6,"wrtc":3}],6:[function(require,module,exports){
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
},{"wrtc":3}],7:[function(require,module,exports){
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
},{}]},{},[1]);
