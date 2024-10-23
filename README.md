# Chrono

Chrono is a network diagnostic tool that returns connection data (Ping/Latency, Jitter, Packet Loss) as a graded result to the user. Use this to predict your performance in multiplayer games!

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Code Overview](#code-overview)
  - [Client](#client)
  - [Server](#server)
- [Building the Project](#building-the-project)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Ping/Latency Measurement**: Measure the round-trip time for packets sent to the server.
- **Jitter Calculation**: Calculate the variation in packet arrival times.
- **Packet Loss Detection**: Identify the percentage of packets lost during transmission.
- **Real-time Results**: Display results in real-time using progress bars and other UI elements.
- **Graded Results**: Provide a graded result to help users understand their network performance.

## Installation

To install and run Chrono locally, follow these steps:

1. Clone the repository:
    ```sh
    git clone https://github.com/nskape/chrono.git
    cd chrono
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Start the server:
    ```sh
    node server.js
    ```

## Usage

1. Open `index.html` in your web browser.
2. Click the "Start" button to begin the network diagnostic test.
3. View the results displayed on the UI.

## Configuration

The WebRTC configuration can be customized in the [`rtc.config`](rtc.config) file. This file contains the RTC configuration settings used to establish the peer-to-peer connection.

## Code Overview

### Client

The client-side code is located in [`client.js`](client.js). It handles the UI updates and network diagnostic calculations.

#### Key Functions

- [`runClient`](client.js): Initializes and runs the client application.
- [`runClientEnd`](client.js): Executes the client end sequence by resetting progress bars and transitioning UI elements.
- [`updateOutput`](client.js): Updates the output values displayed on the UI.
- [`main`](client.js): Main function to run the WebSocket and RTC client test.

### Server

The server-side code is located in [`server.js`](server.js). It sets up the WebSocket server and handles communication with the client.

#### Key Functions

- [`setupWebSocketServer`](server.js): Initializes the WebSocket server and handles incoming connections.
- [`handleClientMessage`](server.js): Processes messages received from the client.
- [`sendPacket`](server.js): Sends a packet to the client at specified intervals.

## Building the Project

To bundle the client-side JavaScript into a single file (`bundle.js`), follow these steps:

1. Ensure you have Browserify installed:
    ```sh
    npm install -g browserify
    ```

2. Run the following command to create `bundle.js`:
    ```sh
    browserify client.js -o bundle.js
    ```

This will bundle all the necessary client-side JavaScript files into `bundle.js`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.