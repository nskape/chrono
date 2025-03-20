# Chrono

A network quality testing tool that measures your connection's performance through WebRTC.

## Important Note

Running this tool locally on your computer will not provide meaningful network testing results. The tool needs to be hosted on a remote server to properly measure network metrics between your device and the server.

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

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- A server or hosting platform (e.g., DigitalOcean, AWS, Heroku)

### Installation

1. Clone this repository or download the source code
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

3. Build for production:
```bash
npm run build
```

4. Deploy the built files from the `dist` directory to your hosting platform of choice. The specific deployment steps will vary depending on your hosting provider.

### Development

If you want to make changes to the code, you can run the development server:

```bash
npm run dev
```

Then open your browser to `http://localhost:3000`. Remember that while you can develop and test the UI locally, the network testing functionality will not provide meaningful results until deployed to a remote server.

## Technical Details

### Network Metrics

- **Latency**: Measures round-trip time (RTT) between client and server
- **Packet Loss**: Monitors successful packet delivery rate
- **Connection Quality**: Basic evaluation of overall connection stability

### Architecture

- Built with JavaScript
- Uses WebRTC for network measurements
- Simple, lightweight design

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
