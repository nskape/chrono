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