#!/bin/bash

# Create necessary directories if they don't exist
mkdir -p public src img

# Create package.json if it doesn't exist
if [ ! -f package.json ]; then
  cat > package.json << 'EOL'
{
  "name": "chrono",
  "version": "1.0.0",
  "description": "Chrono - WebRTC packet test with sleek Ookla-style interface",
  "main": "index.js",
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production"
  },
  "dependencies": {
    "chart.js": "^4.4.1",
    "webrtc-adapter": "^8.2.3"
  },
  "devDependencies": {
    "copy-webpack-plugin": "^11.0.0",
    "css-loader": "^6.8.1",
    "html-webpack-plugin": "^5.5.3",
    "style-loader": "^3.3.3",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^4.15.1"
  }
}
EOL
fi

# Create webpack.config.js if it doesn't exist
if [ ! -f webpack.config.js ]; then
  cat > webpack.config.js << 'EOL'
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public/img', to: 'img' }
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
  },
};
EOL
fi

# Create public/index.html if it doesn't exist
if [ ! -f public/index.html ]; then
  cat > public/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en" class="dark-mode">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chrono - WebRTC Packet Test</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-container">
        <img src="img/chrono-bold-white.png" alt="Chrono" class="logo-image">
      </div>
    </header>
    
    <main>
      <div class="test-circle-container">
        <div class="test-circle">
          <div class="test-progress-circle"></div>
          <div class="test-button">GO</div>
        
          <div class="test-results">
            <div class="results-header">
              <h2>Test Results</h2>
            </div>
            
            <div class="results-cards">
              <div class="result-card">
                <h3>Packet Loss</h3>
                <div class="result-value" id="packet-loss-value">0%</div>
              </div>
              
              <div class="result-card">
                <h3>MOS Score</h3>
                <div class="result-value">
                  <span id="mos-grade">-</span>
                  <span id="mos-value">-</span>
                </div>
              </div>
              
              <div class="result-card">
                <h3>Avg. Latency</h3>
                <div class="result-value" id="avg-latency">0 ms</div>
              </div>
            </div>
            
            <div class="chart-container">
              <canvas id="packet-chart"></canvas>
            </div>
            
            <button class="test-again-btn">Test Again</button>
          </div>
        </div>
      </div>
    </main>
    
    <footer>
      <p>Chrono uses WebRTC to measure your connection quality</p>
    </footer>
  </div>
</body>
</html>
EOL
fi

# Create src/styles.css if it doesn't exist
if [ ! -f src/styles.css ]; then
  cat > src/styles.css << 'EOL'
:root {
  /* Dark mode colors - updating to dark navy blue */
  --bg-color: #1a1f2c;
  --card-bg: #242c3d;
  --text-color: #e0e0e0;
  --text-secondary: #adb5bd;
  --primary-color: #818cf8;
  --primary-hover: #6366f1;
  --shadow-color: rgba(0, 0, 0, 0.3);
  --border-color: #2d3748;
  --chart-bg: rgba(129, 140, 248, 0.2);
  --chart-border: #818cf8;
  --progress-track: rgba(255, 255, 255, 0.1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}

.logo-image {
  max-height: 60px;
  width: auto;
  display: block;
}

.test-circle-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 40px 0;
  height: 400px;
  position: relative;
}

.test-circle {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.test-circle:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 25px var(--shadow-color);
}

.test-progress-circle {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--progress-track);
  transition: all 0.3s ease;
  overflow: hidden;
}

.test-progress-circle::before {
  content: '';
  position: absolute;
  top: 5px;
  left: 5px;
  right: 5px;
  bottom: 5px;
  border-radius: 50%;
  background: conic-gradient(var(--primary-color) 0%, transparent 0%);
  transition: background 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 15px rgba(129, 140, 248, 0.3);
  clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%);
  transform-origin: center;
}

.test-button {
  position: relative;
  z-index: 2;
  width: 140px;
  height: 140px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2.6rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.test-button.hidden {
  opacity: 0 !important;
  visibility: hidden !important;
  display: none !important;
}

.test-results {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.5s ease;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.5s ease, visibility 0.5s ease;
  z-index: 3;
  background: rgba(26, 31, 44, 0.7);
  backdrop-filter: blur(5px);
  border-radius: 50%;
}

.test-results.visible {
  opacity: 1;
  visibility: visible;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.results-header {
  text-align: center;
  margin-bottom: 20px;
}

.results-header h2 {
  font-size: 1.8rem;
  color: var(--text-color);
  font-weight: 600;
  margin-bottom: 5px;
}

.results-cards {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 25px;
  width: 100%;
  max-width: 800px;
}

.result-card {
  flex: 1;
  min-width: 150px;
  max-width: 200px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 12px var(--shadow-color);
  padding: 15px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.result-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px var(--shadow-color);
}

.result-card h3 {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 10px;
  font-weight: 500;
}

.result-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-color);
}

#mos-grade {
  display: inline-block;
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  border-radius: 50%;
  margin-right: 8px;
  font-size: 1.3rem;
  font-weight: 700;
}

.grade-a {
  background-color: #10b981;
  color: white;
}

.grade-b {
  background-color: #3b82f6;
  color: white;
}

.grade-c {
  background-color: #f59e0b;
  color: white;
}

.grade-d {
  background-color: #f97316;
  color: white;
}

.grade-f {
  background-color: #ef4444;
  color: white;
}

.chart-container {
  width: 100%;
  max-width: 800px;
  height: 250px;
  margin-bottom: 25px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 12px var(--shadow-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.test-again-btn {
  display: block;
  padding: 12px 25px;
  background: rgba(129, 140, 248, 0.2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(129, 140, 248, 0.2);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(129, 140, 248, 0.3);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.test-again-btn:hover {
  background: rgba(129, 140, 248, 0.3);
  transform: translateY(-2px);
}

.test-again-btn:active {
  transform: translateY(0);
}

footer {
  text-align: center;
  margin-top: 40px;
  padding-top: 20px;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-color);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .results-cards {
    flex-direction: column;
  }
  
  .result-card {
    width: 100%;
  }
  
  .test-circle {
    width: 180px;
    height: 180px;
  }
  
  .test-button {
    width: 120px;
    height: 120px;
    font-size: 2.2rem;
  }
  
  .logo-image {
    max-height: 40px;
  }
}
EOL
fi

# Create src/webrtc-test.js if it doesn't exist
if [ ! -f src/webrtc-test.js ]; then
  cat > src/webrtc-test.js << 'EOL'
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
    this.onProgressUpdate = null;
    this.onTestComplete = null;
  }

  async startTest() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.packets = [];
    this.packetsSent = 0;
    this.packetsReceived = 0;
    
    try {
      await this.setupConnections();
      this.runTest();
    } catch (error) {
      console.error('Error starting test:', error);
      this.isRunning = false;
    }
  }

  async setupConnections() {
    // Create the local connection and its data channel
    this.localConnection = new RTCPeerConnection();
    this.sendChannel = this.localConnection.createDataChannel('sendChannel');
    this.sendChannel.binaryType = 'arraybuffer';
    
    // Set up the remote connection and its data channel event handlers
    this.remoteConnection = new RTCPeerConnection();
    this.remoteConnection.ondatachannel = (event) => {
      this.receiveChannel = event.channel;
      this.receiveChannel.onmessage = this.handleReceiveMessage.bind(this);
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
    const startTime = Date.now();
    const endTime = startTime + this.testDuration;
    let lastProgressUpdate = 0;
    
    const sendPacket = () => {
      if (!this.isRunning || Date.now() >= endTime) {
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
EOL
fi

# Create src/index.js if it doesn't exist
if [ ! -f src/index.js ]; then
  cat > src/index.js << 'EOL'
import './styles.css';
import WebRTCPacketTest from './webrtc-test';
import Chart from 'chart.js/auto';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const testCircle = document.querySelector('.test-circle');
  const testButton = document.querySelector('.test-button');
  const progressCircle = document.querySelector('.test-progress-circle');
  const testResults = document.querySelector('.test-results');
  const packetLossValue = document.getElementById('packet-loss-value');
  const mosGrade = document.getElementById('mos-grade');
  const mosValue = document.getElementById('mos-value');
  const avgLatency = document.getElementById('avg-latency');
  const testAgainBtn = document.querySelector('.test-again-btn');
  
  // Chart
  let packetChart = null;
  
  // WebRTC Test
  const webrtcTest = new WebRTCPacketTest();
  
  // Set up progress update callback
  webrtcTest.onProgressUpdate = (progress) => {
    const percentage = Math.min(100, Math.round(progress * 100));
    
    // Apply the Ookla-style animation
    const angle = (percentage / 100) * 360;
    const styleElem = document.getElementById('progress-style') || (() => {
      const style = document.createElement('style');
      style.id = 'progress-style';
      document.head.appendChild(style);
      return style;
    })();
    
    styleElem.textContent = `
      .test-progress-circle::before {
        clip-path: polygon(
          50% 50%, 
          50% 0%, 
          ${angle <= 90 ? (50 + 50 * Math.tan(angle * Math.PI / 180)) + '% 0%' : '100% 0%'},
          ${angle > 90 ? '100% ' + (50 - 50 * Math.tan((180 - angle) * Math.PI / 180)) + '%' : '100% 0%'},
          ${angle > 180 ? (50 - 50 * Math.tan((angle - 180) * Math.PI / 180)) + '% 100%' : '100% 100%'},
          ${angle > 270 ? '0% ' + (50 + 50 * Math.tan((360 - angle) * Math.PI / 180)) + '%' : '0% 100%'},
          ${angle <= 270 ? '0% 0%' : '0% 0%'},
          50% 0%
        );
        background: var(--primary-color);
      }
    `;
    
    testButton.textContent = `${percentage}%`;
  };
  
  // Set up test complete callback
  webrtcTest.onTestComplete = (results) => {
    // Update UI with results
    packetLossValue.textContent = `${results.packetLoss}%`;
    mosGrade.textContent = results.grade;
    mosGrade.className = `grade-${results.grade.toLowerCase()}`;
    mosValue.textContent = results.mos;
    avgLatency.textContent = `${results.avgRtt} ms`;
    
    // Hide test button and show results
    testButton.classList.add('hidden');
    
    setTimeout(() => {
      testResults.classList.add('visible');
      
      // Create chart
      createPacketChart(results.packets);
    }, 300);
  };
  
  // Start test on button click
  testCircle.addEventListener('click', () => {
    if (!webrtcTest.isRunning && !testResults.classList.contains('visible')) {
      // Reset progress style
      const styleElem = document.getElementById('progress-style');
      if (styleElem) styleElem.textContent = '';
      
      // Start test
      webrtcTest.startTest();
    }
  });
  
  // Test again button
  testAgainBtn.addEventListener('click', () => {
    // Hide results and show button
    testResults.classList.remove('visible');
    
    setTimeout(() => {
      testButton.classList.remove('hidden');
      
      // Reset progress circle
      const styleElem = document.getElementById('progress-style');
      if (styleElem) styleElem.textContent = '';
      
      // Reset test button
      testButton.textContent = 'GO';
      
      // Wait for animation to complete
      setTimeout(() => {
        // Start test
        webrtcTest.startTest();
      }, 500);
    }, 300);
  });
  
  // Function to create the packet chart
  function createPacketChart(packets) {
    // Destroy existing chart if it exists
    if (packetChart) {
      packetChart.destroy();
    }
    
    // Sort packets by ID
    packets.sort((a, b) => a.id - b.id);
    
    // Prepare data
    const labels = packets.map(packet => packet.id);
    const rttData = packets.map(packet => packet.rtt);
    
    // Get canvas context
    const ctx = document.getElementById('packet-chart').getContext('2d');
    
    // Create chart
    packetChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Packet RTT (ms)',
          data: rttData,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-border').trim(),
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-bg').trim(),
          borderWidth: 2,
          pointRadius: 2,
          pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-border').trim(),
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Packet Round-Trip Time',
            font: {
              size: 14,
              weight: '600'
            },
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
            padding: {
              bottom: 10
            }
          },
          tooltip: {
            backgroundColor: 'rgba(36, 44, 61, 0.8)',
            titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
            bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              title: (tooltipItems) => {
                return `Packet #${tooltipItems[0].label}`;
              },
              label: (tooltipItem) => {
                return `RTT: ${tooltipItem.raw} ms`;
              }
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Packet ID',
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
              font: {
                size: 11
              }
            },
            ticks: {
              maxTicksLimit: 6,
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
              font: {
                size: 10
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          },
          y: {
            title: {
              display: true,
              text: 'RTT (ms)',
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
              font: {
                size: 11
              }
            },
            beginAtZero: true,
            ticks: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
              font: {
                size: 10
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          }
        }
      }
    });
  }
  
  // Check WebRTC support
  if (!navigator.mediaDevices || !window.RTCPeerConnection) {
    alert('Your browser does not support WebRTC. Please use a modern browser like Chrome, Firefox, or Edge.');
  }
});
EOL
fi

# Create README.md if it doesn't exist
if [ ! -f README.md ]; then
  cat > README.md << 'EOL'
# Chrono

A sleek web application that tests a user's packet loss using WebRTC with an Ookla-style interface. The test shows a progress circle that fills up as the test runs, and displays results including packet loss, MOS score, and a chart of packet latency.

## Features

- WebRTC-based packet loss testing
- Ookla-style circular progress indicator
- Detailed results with packet loss percentage
- Mean Opinion Score (MOS) calculation with letter grade
- Interactive chart showing packet latency
- Modern dark mode UI
- Sleek animations and transitions
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone this repository or download the source code
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

## Running the Application

To start the development server:

```bash
npm start
```

This will start the application on http://localhost:9000

## Building for Production

To build the application for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## How It Works

1. The application creates a local WebRTC connection between two peer connections in the same browser
2. It sends packets of data between these connections at regular intervals
3. It measures the round-trip time (RTT) of each packet
4. It calculates packet loss by comparing sent vs. received packets
5. It calculates a Mean Opinion Score (MOS) based on packet loss, latency, and jitter
6. Results are displayed in a user-friendly interface with charts

## Browser Compatibility

This application requires WebRTC support. It works best in:

- Google Chrome (latest)
- Mozilla Firefox (latest)
- Microsoft Edge (latest)
- Safari (latest)

## License

MIT
EOL
fi

echo "Setup complete! To run the project:"
echo "1. Install dependencies: npm install"
echo "2. Start the development server: npm start"
echo "3. Open http://localhost:9000 in your browser" 