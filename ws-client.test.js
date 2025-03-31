const { Server: WsServer } = require("socket.io");


const socket = io("http://localhost:3000"); // Replace with your server URL

// Handle connection
socket.on("connect", () => {
    console.log("Connected to server:", socket.id);
});

// Listen for a message from the server
socket.on("message", (data) => {
    console.log("Received message:", data);
});

// Listen for a custom event
socket.on("userJoined", (username) => {
    console.log(`${username} joined the chat`);
});

// Send a message to the server
socket.emit("chatMessage", "Hello, Server!");

// Handle disconnection
socket.on("disconnect", (reason) => {
    console.log("Disconnected:", reason);
});
