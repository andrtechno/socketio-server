//Основной сервер
require("dotenv").config();

const PORT = process.env.WS_PORT || 3000;
const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const socketHandler = require('./socket');
const redisAdapter = require('@socket.io/redis-adapter');



const {initRedis} = require('./redis');
const fs = require("fs");

const app = express();
const options = {
    key: fs.readFileSync("C:\\OSPanel\\home\\socket.loc\\key.pem"),  // Для теста: самоподписанный ключ
    cert: fs.readFileSync("C:\\OSPanel\\home\\socket.loc\\cert.pem") // Для теста: самоподписанный сертификат
};
const server = http.createServer(options, app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// HTTP API для отправки сообщений в WebSocket
app.use(express.json());


// Инициализация Redis
const redisClient = initRedis(io);

socketHandler(io, redisClient);
//redisClient.rPush('test', 'dsad'); // Сохранение сообщения в Redis


const redisClient2 = await redis.createClient({
    host: process.env.REDIS_HOST, // Адрес сервера Redis
    port: process.env.REDIS_POST,        // Порт сервера Redis
    database: 10
})
    .on('error', err => console.log('Redis Client Error', err))
    .connect();
//
// await redisClient2.set('key', 'value');
// const value = await redisClient2.get('key');
// await redisClient2.disconnect();


app.post("/billing/send_message", (req, res) => {
    const {channel, message} = req.body;

    // Если канал и сообщение указаны, отправляем сообщение в канал
    if (channel && message) {


        io.of("/billing").to(channel).emit("event", message);
        // io.of("/billing").to(channel).emit("ns_message", message);
        console.log(`Sent to channel ${channel}:`, message);
        //res.status(200).send("Message sent");
        res.status(200).json({success: true});
    } else {
        //res.status(400).send("Channel and message are required");
        res.status(400).json({success: false});
    }
});

server.listen(PORT, () => {
    console.log('Socket.io сервер запущен на порту', PORT);
});