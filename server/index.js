const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8082}); //port server runs on (starts websocket server)


//listen to event, function runs when new connection
wss.on("connection", ws => {

    console.log("New client connected!");

    ws.on("message", data => {
        console.log(`Client has sent us: ${data}`);
        //sends back data in uppercase
        ws.send(data.toUpperCase()); 
    });

    ws.on("close", () => {
    
        console.log("Client has disconnected!");

    });

});    