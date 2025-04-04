//Основной сервер
require('dotenv').config();
const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const logger = require('./utils/logger');
const {transactionNamespace} = require("./chats/transaction");
const {createAdapter} = require('@socket.io/redis-adapter');
const redisService = require('./services/redis.service');
const {sendMessage} = require('./socket');

const {
    authMiddleware,
    requestTokenMiddleware
} = require("./middleware");
const {instrument} = require('@socket.io/admin-ui');
const path = require("path");
const validateBillingBody = require("./validators/requests/ValidateBillingBody");
const fs = require('fs');
const i18n = require('i18n');
const setupRedisAdapter = require("./socket/adapter");
const {sendTelegramMessage} = require("./services/telegramService");
const TelegramBot = require("node-telegram-bot-api");


i18n.configure({
    locales: ['en', 'uk', 'ru'],
    directory: path.join(__dirname, 'locales'),
    defaultLocale: 'en',
});
//i18n.setLocale('uk');

const PORT = process.env.WS_PORT || 3000;

const app = express();
const options = {
    //key: fs.readFileSync("C:\\OSPanel\\home\\socket.loc\\key.pem"),  // Для теста: самоподписанный ключ
    //cert: fs.readFileSync("C:\\OSPanel\\home\\socket.loc\\cert.pem"), // Для теста: самоподписанный сертификат
    pingTimeout: 10000, // Увеличить таймаут пинга
    pingInterval: 5000,
};
const server = http.createServer(options, app);
const io = new Server(server, {
    cors: {
        origin: "*",
        //origin: ["http://socket.loc:3000",'http://192.168.211.183:3000'],
        methods: ["GET", "POST"],
        credentials: true
    }
});


// HTTP API для отправки сообщений в WebSocket
app.use(express.json());

// HTTP Admin panel
app.use('/admin', express.static(path.join(__dirname, 'node_modules', '@socket.io/admin-ui', 'ui', 'dist')));

Promise.resolve().then(() => setupRedisAdapter(io)).then(() => {


    //Common Middleware
    io.use(authMiddleware);

    // Интеграция Socket.IO Admin
    instrument(io, {
        auth: false,
        mode: "development"
        //namespaceName: "/admin"
    });


    io.on("connection", (socket) => {
        logger.info(`[${socket.id}]${socket.decoded.id}: подключился.`);


        socket.on("subscribe", (channel) => {
            if (channel) {
                socket.join(channel);
                logger.info(`${socket.id} Подписан на канал: ${channel}`);
            } else {
                logger.info(`${socket.id} Ошибка: Не передан канал в subscribe`);
            }

            socket.on('billing', (data) => {
                console.log(`${socket.id} Получено сообщение:`, data);
            });

            socket.on('transaction', (data, callback) => {
                console.log(`${socket.id} Получено сообщение с запросом подтверждения:`, data);
                sendMessage(socket, data);

                // Отправляем подтверждение клиенту
                if (callback && typeof callback === 'function') {
                    callback([{status: 'accepted', timestamp: Date.now()}]);
                }
            });

        });


        socket.on('disconnect', () => {
            logger.info(`${socket.id} Пользователь отключен: ${socket.decoded.id}`);
        });


        socket.on("ping", () => {
            socket.emit("pong");
        });
    });

    app.post("/push", (req, res) => {

        const {channels, message, event} = req.body;

        // Если канал и сообщение указаны, отправляем сообщение в канал
        if (channels && message && event) {
            io.to(channels).emit(event, message);
            logger.info(`Sent to channel:`, message);
            res.status(200).json({
                success: true,
                message: i18n.__('sendMessageSuccess')
            });
        } else {
            res.status(400).json({
                success: false,
                message: i18n.__('channelOrMessageMissing')
            });
        }
    });


    app.get("/send-telegram", async (req, res) => {

        const chatId = -1002424701840;  // ID вашего канала или группы
        const message = 'message from socket service';
        await sendTelegramMessage(chatId, message);
        // const TELEGRAM_TOKEN = '7628685757:AAGptg14AutduPlu46IMWv3hSJvBZhWPdjA';
        // const bot = new TelegramBot(TELEGRAM_TOKEN);
        // bot.getUpdates().then(updates => {
        //     updates.forEach(update => {
        //         console.log(update.message.chat.id);  // Получаем chatId
        //     });
        // });

        res.status(200).json({
            success: true,
            message: 'Message sent'
        });


    });

    app.post("/send", requestTokenMiddleware, (req, res) => {

        const {channel, message, eventName, namespace} = req.body;

        // Если канал и сообщение указаны, отправляем сообщение в канал
        if (channel && message) {

            let channelName = 'main';
            if (channel) {
                channelName = channel;
            }

            sendMessage(io, {
                channel: channelName,
                eventName: eventName,
                message: message,
                namespace: namespace
            });


            logger.info(`Sent to channel ${channel}:`, message);
            res.status(200).json({
                success: true,
                message: i18n.__('sendMessageSuccess')
            });
        } else {
            res.status(400).json({
                success: false,
                message: i18n.__('channelOrMessageMissing')
            });
        }
    });


    transactionNamespace(io).then(r => {

        // app.post("/:channel/send", authenticateToken, (req, res) => {
        //
        //     const {channel, message, eventName,namespace} = req.body;
        //
        //
        //     // Если канал и сообщение указаны, отправляем сообщение в канал
        //     if (channel && message) {
        //         io.of(`/${namespace}`).to(channel).timeout(5000).emit(eventName, message, (err, responses) => {
        //             if (err) {
        //                 logger.info('the client did not acknowledge the event in the given delay');
        //             } else {
        //                 if (responses[0] && responses[0].status === "accepted") {
        //                     logger.info("Подтвердил получение сообщения:", responses);
        //                 } else {
        //                     logger.info("Не отправил подтверждение! записываем в Redis");
        //                 }
        //             }
        //         });
        //
        //
        //         logger.info(`Sent to channel ${channel}:`, message);
        //         res.status(200).json({success: true});
        //     } else {
        //         res.status(400).json({success: false});
        //     }
        // });

    });
    // billingNamespace(io).then(r => {
    //
    //     app.post("/billing/send", authenticateToken, (req, res) => {
    //
    //         const channel = 'billing'; // Получаем параметр из URL
    //
    //         const {message,namespace} = req.body;
    //
    //
    //         // Если канал и сообщение указаны, отправляем сообщение в канал
    //         if (channel && message) {
    //             io.to(channel).timeout(5000).emit("test", {text: 'lalal'});
    //
    //             // io.of("/billing").to(channel).emit("event", message);
    //             io.of(`/${namespace}`).to(channel).timeout(5000).emit("event", message, (err, responses) => {
    //                 if (err) {
    //                     logger.info('the client did not acknowledge the event in the given delay');
    //                 } else {
    //                     if (responses[0] && responses[0].status === "accepted") {
    //                         logger.info("Подтвердил получение сообщения:", responses);
    //                     } else {
    //
    //
    //                         getRedisClient().then((redis) => {
    //                             redis.rPush(`channel:${channel}:messages`, JSON.stringify(message));
    //
    //
    //                             scanKeys('subscribe:billing:*')
    //                                 .then(list => {
    //
    //
    //                                     list.forEach((item) => {
    //
    //                                         //  const [first, channel, user_id] = item.split(':');
    //                                         //    console.log(first,channel,user_id);
    //
    //
    //                                         logger.info(item);
    //                                         // redis.rPush(`messed:${item}`, JSON.stringify(message));
    //                                     });
    //
    //                                 })
    //                                 .catch(console.error);
    //
    //                             // const data = {
    //                             //     channel: channel,
    //                             //     message: JSON.stringify(message)
    //                             // }
    //                             // redis.hSet(`channel:${channel}:messages`, data);
    //                         });
    //
    //
    //                         logger.info("Не отправил подтверждение! записываем в Redis");
    //
    //                     }
    //                 }
    //             });
    //
    //
    //             logger.info(`Sent to channel ${channel}:`, message);
    //             res.status(200).json({success: true});
    //         } else {
    //             res.status(400).json({success: false});
    //         }
    //     });
    //
    // });


    // Обработка отключения клиента (например, если клиент закрыл соединение)
    server.on('close', () => {
        logger.info('Клиент отключился');
    });

    // Обработка события завершения запроса (response)
    server.on('finish', () => {
        logger.info('Ответ отправлен');
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
        logger.info(`Socket.io сервер запущен на порту ${PORT}`, 'params_test');
    });

}).catch(error => {
    console.log(error);
});

async function shutdown() {
    try {
        console.log('Завершаем процесс...');
        //await redisService.quit();  // Убедитесь, что у вас есть метод для закрытия соединения
        process.exit(0); // Завершаем процесс с кодом 0 (успешно)
    } catch (error) {
        // Логируем ошибки, если они произошли
        console.error('Ошибка при удалении ключей:', error);
        process.exit(1); // Завершаем процесс с кодом 1 (ошибка)
    }
}


process.on('SIGINT', shutdown);   // Ctrl+C
process.on('SIGTERM', shutdown);  // Команда kill
process.on('exit', shutdown);     // Завершение процесса
process.on('uncaughtException', (err) => {
    logger.error('Необработанное исключение:', err);
    shutdown();
});



