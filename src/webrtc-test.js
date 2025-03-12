import adapter from 'webrtc-adapter';

class WebRTCPacketTest {
  constructor() {
    this.localConnection = null;
    this.remoteConnection = null;
    this.sendChannel = null;
    this.receiveChannel = null;
    this.packets = [];
    this.packetsSent = 0;
    this.packetsReceived = 0;
    this.testDuration = 10000; // 10 seconds
    this.packetInterval = 50; // Send a packet every 50ms
    this.packetSize = 1000; // 1KB packets
    this.isRunning = false;
    this.onProgressUpdate = null; // Callback for progress updates
    this.onTestComplete = null; // Callback for test completion
    this.channelReady = false; // Flag to track if the channel is ready
  }

  // Start the test
  start() {
    this.startTest();
  }

  async startTest() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.packets = [];
    this.packetsSent = 0;
    this.packetsReceived = 0;
    this.channelReady = false;
    
    try {
      await this.setupConnections();
      // We'll start the test when the channel is open
    } catch (error) {
      console.error('Error starting test:', error);
      this.isRunning = false;
      if (this.onTestComplete) {
        this.onTestComplete({
          packetsSent: 0,
          packetsReceived: 0,
          packetLoss: 0,
          avgRtt: 0,
          jitter: 0,
          mos: 1,
          grade: 'F',
          packets: []
        });
      }
    }
  }

  async setupConnections() {
    // Create the local connection and its data channel
    this.localConnection = new RTCPeerConnection();
    this.sendChannel = this.localConnection.createDataChannel('sendChannel');
    this.sendChannel.binaryType = 'arraybuffer';
    
    // Add event handlers for the send channel
    this.sendChannel.onopen = () => {
      console.log('Data channel is open and ready to use');
      this.channelReady = true;
      this.runTest();
    };
    
    this.sendChannel.onclose = () => {
      console.log('Data channel closed');
      this.channelReady = false;
    };
    
    this.sendChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      this.channelReady = false;
    };
    
    // Set up the remote connection and its data channel event handlers
    this.remoteConnection = new RTCPeerConnection();
    this.remoteConnection.ondatachannel = (event) => {
      this.receiveChannel = event.channel;
      this.receiveChannel.onmessage = this.handleReceiveMessage.bind(this);
      
      this.receiveChannel.onopen = () => {
        console.log('Receive channel opened');
      };
      
      this.receiveChannel.onclose = () => {
        console.log('Receive channel closed');
      };
    };
    
    // Set up ICE candidate handling
    this.localConnection.onicecandidate = (e) => {
      if (e.candidate) {
        this.remoteConnection.addIceCandidate(e.candidate);
      }
    };
    
    this.remoteConnection.onicecandidate = (e) => {
      if (e.candidate) {
        this.localConnection.addIceCandidate(e.candidate);
      }
    };
    
    // Create and set the offer
    const offer = await this.localConnection.createOffer();
    await this.localConnection.setLocalDescription(offer);
    await this.remoteConnection.setRemoteDescription(offer);
    
    // Create and set the answer
    const answer = await this.remoteConnection.createAnswer();
    await this.remoteConnection.setLocalDescription(answer);
    await this.localConnection.setRemoteDescription(answer);
  }

  runTest() {
    if (!this.channelReady) {
      console.log('Data channel not ready, waiting...');
      setTimeout(() => this.runTest(), 100);
      return;
    }
    
    console.log('Starting to send packets');
    const startTime = Date.now();
    const endTime = startTime + this.testDuration;
    let lastProgressUpdate = 0;
    
    const sendPacket = () => {
      if (!this.isRunning || Date.now() >= endTime) {
        this.completeTest();
        return;
      }
      
      if (!this.channelReady) {
        console.log('Channel closed during test');
        this.completeTest();
        return;
      }
      
      const currentTime = Date.now();
      const progress = (currentTime - startTime) / this.testDuration;
      
      // Update progress every 100ms
      if (currentTime - lastProgressUpdate > 100) {
        if (this.onProgressUpdate) {
          this.onProgressUpdate(progress);
        }
        lastProgressUpdate = currentTime;
      }
      
      // Send a packet
      const packetId = this.packetsSent++;
      const packet = {
        id: packetId,
        timestamp: currentTime,
        data: new Array(this.packetSize).fill('X').join('')
      };
      
      try {
        this.sendChannel.send(JSON.stringify(packet));
      } catch (error) {
        console.error('Error sending packet:', error);
        // Don't stop the test on error, just log it
      }
      
      // Schedule the next packet
      setTimeout(sendPacket, this.packetInterval);
    };
    
    // Start sending packets
    sendPacket();
  }

  handleReceiveMessage(event) {
    try {
      const packet = JSON.parse(event.data);
      this.packetsReceived++;
      
      // Calculate round-trip time
      const rtt = Date.now() - packet.timestamp;
      
      // Store packet data
      this.packets.push({
        id: packet.id,
        rtt: rtt,
        timestamp: packet.timestamp,
        receivedAt: Date.now()
      });
    } catch (error) {
      console.error('Error handling received packet:', error);
    }
  }

  completeTest() {
    this.isRunning = false;
    
    // Close connections
    if (this.sendChannel) {
      this.sendChannel.close();
    }
    
    if (this.localConnection) {
      this.localConnection.close();
    }
    
    if (this.remoteConnection) {
      this.remoteConnection.close();
    }
    
    // Calculate results
    const results = this.calculateResults();
    
    // Call the completion callback
    if (this.onTestComplete) {
      this.onTestComplete(results);
    }
  }

  calculateResults() {
    // Calculate packet loss percentage
    const packetLoss = this.packetsSent > 0 
      ? ((this.packetsSent - this.packetsReceived) / this.packetsSent) * 100 
      : 0;
    
    // Calculate average RTT
    let totalRtt = 0;
    this.packets.forEach(packet => {
      totalRtt += packet.rtt;
    });
    const avgRtt = this.packets.length > 0 ? totalRtt / this.packets.length : 0;
    
    // Calculate jitter (variation in RTT)
    let jitterSum = 0;
    for (let i = 1; i < this.packets.length; i++) {
      const rttDiff = Math.abs(this.packets[i].rtt - this.packets[i-1].rtt);
      jitterSum += rttDiff;
    }
    const jitter = this.packets.length > 1 ? jitterSum / (this.packets.length - 1) : 0;
    
    // Calculate MOS (Mean Opinion Score) using the E-model
    // Simplified version based on ITU-T G.107
    let mos = 4.5;
    
    // Reduce MOS based on latency (RTT)
    if (avgRtt > 100) {
      mos -= 0.5;
    }
    if (avgRtt > 200) {
      mos -= 0.5;
    }
    if (avgRtt > 300) {
      mos -= 0.5;
    }
    
    // Reduce MOS based on packet loss
    if (packetLoss > 0) {
      mos -= packetLoss * 0.05;
    }
    
    // Reduce MOS based on jitter
    if (jitter > 20) {
      mos -= 0.5;
    }
    if (jitter > 50) {
      mos -= 0.5;
    }
    
    // Ensure MOS is within range 1-5
    mos = Math.max(1, Math.min(5, mos));
    
    // Determine grade based on MOS
    let grade;
    if (mos >= 4.3) {
      grade = 'A';
    } else if (mos >= 4.0) {
      grade = 'B';
    } else if (mos >= 3.5) {
      grade = 'C';
    } else if (mos >= 3.0) {
      grade = 'D';
    } else {
      grade = 'F';
    }
    
    return {
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      packetLoss: packetLoss.toFixed(2),
      avgRtt: avgRtt.toFixed(2),
      jitter: jitter.toFixed(2),
      mos: mos.toFixed(2),
      grade: grade,
      packets: this.packets
    };
  }
}

export default WebRTCPacketTest; 