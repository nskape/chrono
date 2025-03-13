import './styles.css';
import WebRTCPacketTest from './webrtc-test';
import Chart from 'chart.js/auto';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the application
  initApp();
});

// Main application initialization
function initApp() {
  // Initialize about panel
  initAboutPanel();
  
  // Initialize tooltips
  initTooltips();
  
  // Initialize settings panel
  initSettingsPanel();
  
  // Initialize the WebRTC test
  initTest();
}

// Initialize about panel
function initAboutPanel() {
  const aboutButton = document.getElementById('about-button');
  const aboutPanel = document.getElementById('about-panel');
  const closeAboutBtn = document.getElementById('close-about');
  
  if (aboutButton && aboutPanel && closeAboutBtn) {
    // Add smooth entrance animation for about sections
    const aboutSections = document.querySelectorAll('.about-section');
    
    aboutButton.addEventListener('click', () => {
      aboutPanel.classList.add('visible');
      
      // Animate sections with a slight delay between each
      aboutSections.forEach((section, index) => {
        setTimeout(() => {
          section.style.opacity = '1';
          section.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
      });
    });
    
    closeAboutBtn.addEventListener('click', () => {
      aboutPanel.classList.remove('visible');
      
      // Reset section animations
      aboutSections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
      });
    });
    
    // Close about panel when clicking outside the content
    aboutPanel.addEventListener('click', (e) => {
      if (e.target === aboutPanel) {
        aboutPanel.classList.remove('visible');
        
        // Reset section animations
        aboutSections.forEach(section => {
          section.style.opacity = '0';
          section.style.transform = 'translateY(20px)';
        });
      }
    });
    
    // Close about panel with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && aboutPanel.classList.contains('visible')) {
        aboutPanel.classList.remove('visible');
        
        // Reset section animations
        aboutSections.forEach(section => {
          section.style.opacity = '0';
          section.style.transform = 'translateY(20px)';
        });
      }
    });
    
    // Initialize sections as hidden
    aboutSections.forEach(section => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
  }
}

// Initialize tooltips
function initTooltips() {
  // Add tooltip functionality for elements with data-tooltip attribute
  const tooltipElements = document.querySelectorAll('[data-tooltip]');
  
  tooltipElements.forEach(element => {
    element.setAttribute('role', 'tooltip');
    element.setAttribute('aria-label', element.getAttribute('data-tooltip'));
  });
}

// Initialize settings panel
function initSettingsPanel() {
  const settingsButton = document.getElementById('settings-button');
  const settingsPanel = document.getElementById('settings-panel');
  const closeSettingsBtn = document.getElementById('close-settings');
  const saveSettingsBtn = document.getElementById('save-settings');
  
  // Input fields
  const packetSizeInput = document.getElementById('packet-size');
  const frequencyInput = document.getElementById('frequency');
  const durationInput = document.getElementById('duration');
  
  // Default values
  const defaultSettings = {
    packetSize: 1000,
    frequency: 20,
    duration: 10
  };
  
  // Current settings
  let currentSettings = { ...defaultSettings };
  
  if (settingsButton && settingsPanel && closeSettingsBtn && saveSettingsBtn) {
    // Open settings panel
    settingsButton.addEventListener('click', () => {
      // Update input fields with current settings
      packetSizeInput.value = currentSettings.packetSize;
      frequencyInput.value = currentSettings.frequency;
      durationInput.value = currentSettings.duration;
      
      // Show settings panel
      settingsPanel.classList.add('visible');
    });
    
    // Close settings panel
    closeSettingsBtn.addEventListener('click', () => {
      settingsPanel.classList.remove('visible');
    });
    
    // Close settings panel when clicking outside the content
    settingsPanel.addEventListener('click', (e) => {
      if (e.target === settingsPanel) {
        settingsPanel.classList.remove('visible');
      }
    });
    
    // Close settings panel with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsPanel.classList.contains('visible')) {
        settingsPanel.classList.remove('visible');
      }
    });
    
    // Save settings
    saveSettingsBtn.addEventListener('click', () => {
      // Validate and save settings
      const packetSize = parseInt(packetSizeInput.value);
      const frequency = parseInt(frequencyInput.value);
      const duration = parseInt(durationInput.value);
      
      // Validate inputs
      if (isNaN(packetSize) || packetSize < 100 || packetSize > 10000) {
        alert('Packet size must be between 100 and 10000 bytes');
        return;
      }
      
      if (isNaN(frequency) || frequency < 1 || frequency > 50) {
        alert('Frequency must be between 1 and 50 pings/second');
        return;
      }
      
      if (isNaN(duration) || duration < 5 || duration > 60) {
        alert('Duration must be between 5 and 60 seconds');
        return;
      }
      
      // Save settings
      currentSettings = {
        packetSize: packetSize,
        frequency: frequency,
        duration: duration
      };
      
      // Update parameter display in results
      updateParameterDisplay();
      
      // Close settings panel
      settingsPanel.classList.remove('visible');
    });
    
    // Function to update parameter display in results
    function updateParameterDisplay() {
      const packetSizeDisplay = document.getElementById('param-packet-size');
      const frequencyDisplay = document.getElementById('param-frequency');
      const durationDisplay = document.getElementById('param-duration');
      
      if (packetSizeDisplay) {
        packetSizeDisplay.textContent = currentSettings.packetSize;
      }
      
      if (frequencyDisplay) {
        frequencyDisplay.textContent = currentSettings.frequency;
      }
      
      if (durationDisplay) {
        durationDisplay.textContent = currentSettings.duration;
      }
    }
    
    // Initialize parameter display
    updateParameterDisplay();
  }
  
  // Return current settings for use in other functions
  return {
    getSettings: () => currentSettings
  };
}

// Main function to initialize the WebRTC test
function initTest() {
  // Move these variable declarations to the top of the function
  // so they're accessible to all nested functions
  const testButton = document.querySelector('.test-button');
  const testCircle = document.querySelector('.test-circle');
  const testTimer = document.querySelector('.test-timer');
  const testResults = document.querySelector('.test-results');
  const testAgainBtn = document.querySelector('.test-again-btn');
  const testProgressCircle = document.querySelector('.test-progress-circle');
  const settingsButton = document.getElementById('settings-button');
  const packetLossValue = document.getElementById('packet-loss-value');
  const mosGrade = document.getElementById('mos-grade');
  const mosValue = document.getElementById('mos-value');
  const avgLatency = document.getElementById('avg-latency');
  const jitterElement = document.getElementById('jitter-value');
  const durationElement = document.getElementById('duration-value');
  const packetChart = document.getElementById('packet-chart');
  
  // Check if all required elements exist
  if (!testButton || !testCircle || !testTimer || !testResults || !testAgainBtn || 
      !testProgressCircle || !packetLossValue || !mosGrade || !mosValue || 
      !avgLatency || !jitterElement || !durationElement || !packetChart) {
    console.error('Some required elements are missing from the DOM');
    return;
  }
  
  let startTime;
  let interval;
  let webrtcTest = null;
  let totalSent = 0;
  let totalReceived = 0;
  let chartObject = null;
  let progressRing = null;
  
  // Get settings from the settings panel
  const settingsManager = window.settingsManager || initSettingsPanel();
  
  // Create SVG progress ring
  progressRing = createProgressRing();
  
  // Function to set progress - moved inside initTest to access progressRing
  function setProgress(percent) {
    if (!progressRing) {
      console.error('Progress ring not initialized');
      return;
    }
    
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    progressRing.setAttribute('stroke-dashoffset', offset);
  }
  
  // Initialize the chart function - moved inside initTest to access chartObject
  function initChart() {
    if (chartObject) {
      chartObject.destroy();
    }
    
    const ctx = packetChart.getContext('2d');
    chartObject = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Latency (ms)',
          data: [],
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim(),
          backgroundColor: 'rgba(129, 140, 248, 0.2)',
          tension: 0.2,
          fill: true,
          borderWidth: 1,
          pointRadius: 1.5,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(40, 44, 52, 0.9)',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0',
            titleFont: {
              size: 12,
              family: "'Inter', sans-serif"
            },
            bodyFont: {
              size: 12,
              family: "'Inter', sans-serif"
            },
            padding: 10,
            cornerRadius: 4,
            displayColors: false,
            callbacks: {
              title: (tooltipItems) => {
                return `Packet #${tooltipItems[0].label}`;
              },
              label: (context) => {
                return `Latency: ${context.raw} ms`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Packet #',
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
            },
            grid: {
              display: false
            },
            ticks: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
              maxTicksLimit: 10
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Latency (ms)',
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
            }
          }
        }
      }
    });
  }
  
  // Call initChart to initialize the chart
  initChart();
  
  // Update the chart with new latency data
  function updateChart(latencies) {
    if (chartObject) {
      chartObject.data.labels = Array.from({ length: latencies.length }, (_, i) => i + 1);
      chartObject.data.datasets[0].data = latencies;
      chartObject.update();
    }
  }
  
  // Define the startTest function as a variable to avoid hoisting issues
  const startTest = function() {
    console.log('Starting test...');
    // Stop the pulsing animation
    testCircle.style.animation = 'none';
    
    // Hide the test button and settings button
    testButton.classList.add('hidden');
    if (settingsButton) {
      settingsButton.classList.add('hidden');
    }
    
    // Show and start the timer
    testTimer.classList.add('active');
    testProgressCircle.classList.add('active');
    testTimer.textContent = '0.000s';
    
    // Create elements for packet counts
    const packetInfoContainer = document.createElement('div');
    packetInfoContainer.className = 'packet-info-container';
    packetInfoContainer.id = 'packet-info-container';
    
    const sentPacketsElement = document.createElement('div');
    sentPacketsElement.className = 'packet-count';
    sentPacketsElement.id = 'sent-packets';
    sentPacketsElement.textContent = 'Sent: 0';
    
    const receivedPacketsElement = document.createElement('div');
    receivedPacketsElement.className = 'packet-count';
    receivedPacketsElement.id = 'received-packets';
    receivedPacketsElement.textContent = 'Received: 0';
    
    packetInfoContainer.appendChild(sentPacketsElement);
    packetInfoContainer.appendChild(receivedPacketsElement);
    
    // Add packet info container to test circle
    testCircle.appendChild(packetInfoContainer);
    
    // Reset progress
    setProgress(0);
    
    // Reset test results
    testResults.classList.remove('visible');
    
    // Get current settings
    const settings = settingsManager.getSettings();
    
    // Initialize WebRTCPacketTest
    webrtcTest = new WebRTCPacketTest();
    
    // Apply custom settings
    webrtcTest.packetSize = settings.packetSize;
    webrtcTest.packetInterval = 1000 / settings.frequency; // Convert frequency to interval in ms
    webrtcTest.testDuration = settings.duration * 1000; // Convert duration to ms
    
    // Start the timer
    startTime = Date.now();
    interval = setInterval(() => {
      const elapsedTime = (Date.now() - startTime) / 1000;
      testTimer.textContent = `${elapsedTime.toFixed(3)}s`;
    }, 10);
    
    // Set up progress callback
    webrtcTest.onProgressUpdate = (progress) => {
      // Update progress ring
      setProgress(progress * 100);
      
      // Update packet counts
      totalSent = webrtcTest.packetsSent || 0;
      totalReceived = webrtcTest.packetsReceived || 0;
      
      const sentPacketsElement = document.getElementById('sent-packets');
      const receivedPacketsElement = document.getElementById('received-packets');
      
      if (sentPacketsElement) {
        sentPacketsElement.textContent = `Sent: ${totalSent}`;
      }
      
      if (receivedPacketsElement) {
        receivedPacketsElement.textContent = `Received: ${totalReceived}`;
      }
    };
    
    // Set up completion callback
    webrtcTest.onTestComplete = (results) => {
      console.log('Test complete:', results);
      
      // Clear the timer interval
      clearInterval(interval);
      
      // Hide timer
      testTimer.classList.remove('active');
      
      // Remove packet info container
      const packetInfoContainer = document.getElementById('packet-info-container');
      if (packetInfoContainer) {
        packetInfoContainer.remove();
      }
      
      // Apply blur effect to test circle
      testCircle.classList.add('results-active');
      
      try {
        // Calculate results - ensure these are all numbers or strings, not DOM elements
        const packetLossPercentage = calculatePacketLoss(results.packetsSent, results.packetsReceived);
        const avgLatencyValue = calculateAverageLatency(results.packets.map(p => p.rtt));
        const jitterValue = calculateJitter(results.packets.map(p => p.rtt));
        const mosResult = calculateMOS(packetLossPercentage, avgLatencyValue, jitterValue);
        
        console.log('Calculated results:', {
          packetLoss: packetLossPercentage,
          avgLatency: avgLatencyValue,
          jitter: jitterValue,
          mos: mosResult
        });
        
        // Update UI with results - ensure we're setting textContent on DOM elements
        if (packetLossValue && typeof packetLossValue === 'object') {
          packetLossValue.textContent = `${packetLossPercentage}%`;
        }
        
        // Fix: Ensure mos is an object with value and grade properties
        if (mosResult && typeof mosResult === 'object' && mosResult !== null) {
          if (mosValue && typeof mosValue === 'object') {
            mosValue.textContent = mosResult.value.toFixed(1);
          }
          
          if (mosGrade && typeof mosGrade === 'object') {
            mosGrade.textContent = mosResult.grade;
            mosGrade.className = `grade-${mosResult.grade.toLowerCase()}`;
          }
        }
        
        if (avgLatency && typeof avgLatency === 'object') {
          avgLatency.textContent = `${avgLatencyValue} ms`;
        }
        
        // Use the renamed jitterElement variable
        if (jitterElement && typeof jitterElement === 'object') {
          jitterElement.textContent = `${jitterValue.toFixed(1)} ms`;
        }
        
        // Use the renamed durationElement variable
        if (durationElement && typeof durationElement === 'object') {
          const duration = (results.packets.length > 0) ? 
            ((results.packets[results.packets.length - 1].receivedAt - results.packets[0].timestamp) / 1000).toFixed(1) : 
            '0.0';
          durationElement.textContent = `${duration}s`;
        }
        
        // Update chart
        updateChart(results.packets.map(p => p.rtt));
        
        // Show results
        setTimeout(() => {
          testResults.classList.add('visible');
        }, 500);
      } catch (error) {
        console.error('Error displaying test results:', error);
        // Show a fallback message if there's an error
        alert('An error occurred while displaying test results. Please try again.');
      }
    };
    
    // Start the WebRTC test
    webrtcTest.startTest();
  };
  
  // Define the resetTest function as a variable to maintain consistency
  const resetTest = function() {
    console.log('Resetting test...');
    
    // Remove packet info container if it exists
    const packetInfoContainer = document.getElementById('packet-info-container');
    if (packetInfoContainer) {
      packetInfoContainer.remove();
    }
    
    // Remove blur effect from test circle
    testCircle.classList.remove('results-active');
    
    // Reset the test button
    testButton.textContent = 'GO';
    testButton.classList.remove('hidden');
    
    // Show settings button
    if (settingsButton) {
      settingsButton.classList.remove('hidden');
    }
    
    // Restore the pulsing animation
    testCircle.style.animation = '';
    
    // Hide timer and progress
    testTimer.classList.remove('active');
    testProgressCircle.classList.remove('active');
    testTimer.textContent = '0.000s';
    
    // Hide test results
    testResults.classList.remove('visible');
    
    // Reset progress
    setProgress(0);
    
    // Initialize chart
    initChart();
  };
  
  // Test button click event
  testButton.addEventListener('click', startTest);
  
  // Test again button click event
  testAgainBtn.addEventListener('click', resetTest);
  
  // Store settings manager in window for access from other functions
  window.settingsManager = settingsManager;
}

// Function to create the SVG progress ring
function createProgressRing() {
  const testProgressCircle = document.querySelector('.test-progress-circle');
  
  if (!testProgressCircle) {
    console.error('Progress circle element not found');
    return null;
  }
  
  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'progress-ring');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 200 200');
  
  // Calculate radius and circumference
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  
  // Create background circle
  const backgroundCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  backgroundCircle.setAttribute('class', 'progress-ring__background');
  backgroundCircle.setAttribute('cx', '100');
  backgroundCircle.setAttribute('cy', '100');
  backgroundCircle.setAttribute('r', radius);
  
  // Create track circle
  const trackCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  trackCircle.setAttribute('class', 'progress-ring__circle');
  trackCircle.setAttribute('cx', '100');
  trackCircle.setAttribute('cy', '100');
  trackCircle.setAttribute('r', radius);
  
  // Create progress circle
  const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progressCircle.setAttribute('class', 'progress-ring__circle-progress');
  progressCircle.setAttribute('cx', '100');
  progressCircle.setAttribute('cy', '100');
  progressCircle.setAttribute('r', radius);
  progressCircle.setAttribute('stroke-dasharray', circumference);
  progressCircle.setAttribute('stroke-dashoffset', circumference);
  progressCircle.setAttribute('transform', 'rotate(-90, 100, 100)');
  
  // Append circles to SVG
  svg.appendChild(backgroundCircle);
  svg.appendChild(trackCircle);
  svg.appendChild(progressCircle);
  
  // Append SVG to progress circle container
  testProgressCircle.appendChild(svg);
  
  // Add CSS for the progress ring
  const style = document.createElement('style');
  style.textContent = `
    .progress-ring {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    
    .progress-ring__background {
      fill: transparent;
    }
    
    .progress-ring__circle {
      fill: transparent;
      stroke: rgba(255, 255, 255, 0.1);
      stroke-width: 8;
    }
    
    .progress-ring__circle-progress {
      fill: transparent;
      stroke: var(--theme-primary);
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.2s ease;
    }
  `;
  document.head.appendChild(style);
  
  // Return the progress circle element that needs to be updated
  return progressCircle;
}

// Calculate packet loss percentage
function calculatePacketLoss(sent, received) {
  if (sent === 0) return 0;
  const loss = ((sent - received) / sent) * 100;
  return Math.round(loss * 100) / 100; // Round to 2 decimal places
}

// Calculate average latency
function calculateAverageLatency(latencies) {
  if (latencies.length === 0) return 0;
  const sum = latencies.reduce((acc, curr) => acc + curr, 0);
  return Math.round(sum / latencies.length);
}

// Calculate jitter (variation in latency)
function calculateJitter(latencies) {
  if (latencies.length <= 1) return 0;
  
  let jitterSum = 0;
  for (let i = 1; i < latencies.length; i++) {
    jitterSum += Math.abs(latencies[i] - latencies[i-1]);
  }
  
  return Math.round(jitterSum / (latencies.length - 1));
}

// Calculate MOS (Mean Opinion Score)
function calculateMOS(packetLoss, latency, jitter) {
  // Base MOS score (4.4 is maximum for G.711)
  let mos = 4.4;
  
  // Reduce for latency
  if (latency > 160) mos -= 0.5;
  if (latency > 200) mos -= 0.5;
  if (latency > 300) mos -= 0.5;
  
  // Reduce for jitter
  if (jitter > 20) mos -= 0.3;
  if (jitter > 40) mos -= 0.3;
  if (jitter > 60) mos -= 0.3;
  
  // Reduce for packet loss (most significant impact)
  mos -= packetLoss * 0.1;
  
  // Ensure MOS is between 1 and 5
  mos = Math.max(1, Math.min(5, mos));
  
  // Assign grade based on MOS
  let grade;
  if (mos >= 4.3) {
    grade = 'A';
  } else if (mos >= 3.8) {
    grade = 'B';
  } else if (mos >= 3.3) {
    grade = 'C';
  } else if (mos >= 2.8) {
    grade = 'D';
  } else {
    grade = 'F';
  }
  
  // Return as an object with value and grade properties
  return { 
    value: parseFloat(mos.toFixed(2)), // Ensure it's a number, not a string
    grade: grade 
  };
}

// Check WebRTC support
if (!navigator.mediaDevices || !window.RTCPeerConnection) {
  alert('Your browser does not support WebRTC. Please use a modern browser like Chrome, Firefox, or Edge.');
} 