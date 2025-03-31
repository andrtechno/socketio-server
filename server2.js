//Основной сервер
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import {Server} from 'socket.io';
import fs from 'fs';
import logger from './logger.js';
import {billingNamespace} from "./chats/billing.js";
import {createAdapter} from '@socket.io/redis-adapter';
import {redisConf} from "./redis_con.js";
import {authMiddleware} from "./auth.js";



dotenv.config(); // Load environment variables from .env file
const PORT = process.env.WS_PORT || 3000;

// const logFile = fs.createWriteStream('log.txt', { flags: 'a' });
// const logStdout = process.stdout;
//
// console.log = function (...args) {
//     logFile.write(util.format.apply(null, args) + '\n');
//     logStdout.write(util.format.apply(null, args) + '\n');
// };

const app = express();
const options = {
    key: fs.readFileSync("C:\\OSPanel\\home\\socket.loc\\key.pem"),  // Для теста: самоподписанный ключ
    cert: fs.readFileSync("C:\\OSPanel\\home\\socket.loc\\cert.pem"), // Для теста: самоподписанный сертификат
    // pingTimeout: 60000, // Увеличить таймаут пинга
    // pingInterval: 25000,
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

let pubClient, subClient;

async function setupRedisAdapter() {
    pubClient = redisConf(); // Получаем клиент Redis
    subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    if (pubClient && subClient) {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Redis Adapter подключен');
    }
}


Promise.resolve().then(setupRedisAdapter).then(() => {
    //Middleware
    io.use(authMiddleware);

//transactionNamespace(io);
    billingNamespace(io).then(r => {
        app.post("/send", (req, res) => {
            const {channel, message} = req.body;

            // Если канал и сообщение указаны, отправляем сообщение в канал
            if (channel && message) {


                // io.of("/billing").to(channel).emit("event", message);
                io.of("/billing").to(channel).timeout(5000).emit("event", message, (err, responses) => {
                    if (err) {
                        logger.info('the client did not acknowledge the event in the given delay');
                    } else {
                        if (responses[0] && responses[0].status === "accepted") {
                            logger.info("Подтвердил получение сообщения:", responses);
                        } else {
                            logger.info("Не отправил подтверждение! записываем в Redis");
                            redisClient.rPush(`channel:${channel}:messages`, JSON.stringify(message));
                        }
                    }
                });


                logger.info(`Sent to channel ${channel}:`, message);
                //res.status(200).send("Message sent");
                res.status(200).json({success: true});
            } else {
                //res.status(400).send("Channel and message are required");
                res.status(400).json({success: false});
            }
        });

    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            logger.error('Address in use, retrying...');
            setTimeout(() => {
                server.close();
                server.listen(PORT, () => {
                    logger.info(`Socket.io сервер пере запущен на порту ${PORT}`);
                });
            }, 1000);
        }
    });

    server.listen(PORT, () => {
        logger.info(`Socket.io сервер запущен на порту ${PORT}`,'ffff');
    });

});






