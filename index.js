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
    requestJWTMiddleware
} = require("./middleware");
const {instrument} = require('@socket.io/admin-ui');
const path = require("path");
const validateBillingBody = require("./validators/requests/ValidateBillingBody");
const fs = require('fs');
const i18n = require('i18n');
const setupRedisAdapter = require("./socket/adapter");
const {sendTelegramMessage} = require("./services/telegramService");
const TelegramBot = require("node-telegram-bot-api");
const {socketCorsOptions, corsOptions} = require("./utils/cors");
const cors = require("cors");


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
const allowedOrigins = process.env.CORS_ORIGIN.split(',');
const io = new Server(server, {
    cors: socketCorsOptions
});

app.use(cors(corsOptions));
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
            socket.emit("pong", {data: []});
        });
    });
    // io.on('error', (err) => {
    //     console.error('Socket.IO server error:', err);
    // });
    app.post("/push", (req, res) => {

        let {channels, message, event} = req.body;

        const rawIp = req.ip || req.headers['x-forwarded-for'] || '';
        const clientIp = rawIp.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;

        console.log(clientIp);
        if (!Array.isArray(channels)) {
            channels = channels ? [channels] : [];
        }


        const regex = /^[-a-zA-Z0-9_=@,.;]+$/;
        let errors = [];

        //Validate channels name
        channels.forEach(channel => {
            if (!regex.test(channel)) {
                errors.push('Invalid channel name ' + channel);
            }
        });
        if (!channels.length || !message || !event) {
            errors.push(i18n.__('channelOrMessageMissing'));
        }


        if (errors.length) {
            return res.status(400).json({
                success: false,
                errors: errors
            });
        }

        // Если канал и сообщение указаны, отправляем сообщение в канал
        if (channels && message && event) {
            io.to(channels).emit(event, message);
            logger.info(`Sent to channel:`, message);
            return res.status(200).json({
                success: true,
                message: i18n.__('sendMessageSuccess')
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

    app.post("/send", requestJWTMiddleware, (req, res) => {

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


    transactionNamespace(io).then(() => {


    });


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

    server.listen(PORT, process.env.WS_HOST,() => {
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




// Отслеживание необработанных отклонений (unhandledRejection)
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection:', reason instanceof Error ? reason : new Error(reason));
    // Если нужно завершить процесс, можно вызвать process.exit(1) или не делать этого:
    shutdown();
});



process.on('SIGINT', shutdown);   // Ctrl+C
process.on('SIGTERM', shutdown);  // Команда kill
process.on('exit', shutdown);     // Завершение процесса
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:');
    shutdown();
});



