//Основной сервер
require('dotenv').config();
const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const logger = require('./utils/logger');
const {transactionNamespace} = require("./chats/transaction");
const {createAdapter} = require('@socket.io/redis-adapter');
const redisService = require('./services/redis.service');
const {sendMessage,sendMessageWithAck} = require('./socket');

const {
    authMiddleware, requestJWTMiddleware
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
const requestPushBodyMiddleware = require("./middleware/requestPushBody.middleware");
const ValidateTransactionRequest = require("./validators/requests/ValidateTransactionRequest");


i18n.configure({
    locales: ['en', 'uk', 'ru'], directory: path.join(__dirname, 'locales'), defaultLocale: 'en',
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


// Маппинг для хранения активных namespaces
const namespaces = {};

// Функция для загрузки namespace
async function loadNamespace(namespaceName) {
    const handlerPath = path.join(__dirname, 'namespaces', `${namespaceName}.js`);
    const handler = require(handlerPath);

    // Создаем и настраиваем namespace
    const ns = io.of(`/${namespaceName}`);
    handler(ns);
    namespaces[namespaceName] = ns;
    console.log(`Namespace ${namespaceName} loaded`);
}

// Функция для перезагрузки namespace
async function reloadNamespace(namespaceName) {
    const namespacePath = path.join(__dirname, 'namespaces', `${namespaceName}.js`);
    console.log(`Attempting to reload namespace: ${namespaceName}`);
    // Удаляем старую версию модуля из кэша
    delete require.cache[require.resolve(namespacePath)];


    // Перезагружаем namespace
    await loadNamespace(namespaceName);
    console.log(`Namespace ${namespaceName} reloaded successfully`);

}

// Функция для загрузки всех namespaces
function loadNamespaces() {
    const namespacesDirectory = path.join(__dirname, 'namespaces');
    const files = fs.readdirSync(namespacesDirectory);

    files.forEach(file => {
        if (file.endsWith('.js')) {
            const namespaceName = file.replace('.js', '');
            loadNamespace(namespaceName);
        }
    });
}

// Функция для отправки события в все сокеты конкретного namespace
function sendEventToNamespace(namespaceName, eventName, data) {
    const ns = namespaces[namespaceName];

    if (ns) {
        Object.values(ns.sockets).forEach(socket => {
            // Отправляем событие disconnect
            // socket.disconnect(true); // Принудительно отключаем клиента
        });
        ns.sockets.forEach(socket => {
            //socket.emit(eventName, data);  // Отправляем событие каждому клиенту

            socket.disconnect(true); // Принудительно отключаем клиента
        });
    }
}


Promise.resolve().then(() => setupRedisAdapter(io)).then(() => {


    //Common Middleware
    io.use(authMiddleware);

    // Интеграция Socket.IO Admin
    instrument(io, {
        auth: {
            type: "basic",
            username: "admin",
            password: "$2b$10$OKwBzjZ6kVOrvlXuqBmiD.zTZpKz/AbNs9GgJdnHOR.VOOIG64KfC", //adminsoho
        },
        mode: process.env.NODE_ENV,
        namespaceName: "/admin"
    });
    //console.log(require("bcryptjs").hashSync("adminsoho", 10));


    // function loadNamespaces() {
    //     const namespacesDirectory = path.join(__dirname, 'namespaces');
    //     const files = fs.readdirSync(namespacesDirectory);
    //
    //     files.forEach(file => {
    //         if (file.endsWith('.js')) {
    //             const namespaceName = file.replace('.js', '');
    //             const handler = require(path.join(namespacesDirectory, file));
    //
    //             // Создаем новый namespace и подключаем обработчик
    //             const ns = io.of(`/${namespaceName}`);
    //             handler(ns);
    //             console.log(`Namespace ${namespaceName} loaded`);
    //         }
    //     });
    // }
    // Загружаем все namespaces
    //loadNamespaces();


    // app.get("/reload", (req, res) => {
    //
    //
    //     const namespaceToReload = req.query.namespace || 'namespace2';
    //
    //     try {
    //         // Перед перезагрузкой отправляем событие всем сокетам в этом namespace
    //         sendEventToNamespace(namespaceToReload, 'beforeReload', {message: `The ${namespaceToReload} is going to be reloaded.`});
    //
    //         // Задержка, чтобы событие успело обработаться (можно сделать это асинхронно, если нужно)
    //         setTimeout(() => {
    //             reloadNamespace(namespaceToReload);
    //             res.status(200).send(`Namespace ${namespaceToReload} reloaded successfully`);
    //         }, 1000);  // Задержка 1 секунда, можно настроить
    //
    //     } catch (error) {
    //         console.error(error);
    //         res.status(500).send(`Failed to reload namespace ${namespaceToReload}`);
    //     }
    // })

    io.on("connection", (socket) => {
        logger.info(`[${socket.id}]${socket.decoded.id}: подключился.`);


        // Связываем кастомный socketId с реальным socket.id в Redis
        //   await redisService.set(`socket:${socket.decoded.id}`, socket.id);

        socket.on("subscribe", (channel) => {
            if (channel) {
                socket.join(channel);
                logger.info(`${socket.id} Подписан на канал: ${channel}`);
            } else {
                logger.info(`${socket.id} Ошибка: Не передан канал`);
            }
        });
        socket.on("unsubscribe", (channel) => {
            if (channel) {
                socket.leave(channel);
                logger.info(`${socket.id} Описался от канала: ${channel}`);
            } else {
                logger.info(`${socket.id} Ошибка: Не передан канал`);
            }
        });
        socket.on('reconnect', (attemptNumber) => {
            console.log(`Client reconnected after ${attemptNumber} attempts`);
            socket.emit('message', 'Successfully reconnected!');
        });
        socket.on('disconnect', (reason) => {
            console.log('disconnect:', reason);
            socket.disconnect(true);
        });
        socket.on('reconnect_error', (error) => {
            console.log('Reconnection error:', error);
        });

        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`Attempting to reconnect... Attempt #${attemptNumber}`);
        });
        socket.on('disconnect', () => {
            logger.info(`${socket.id} Пользователь отключен: ${socket.decoded.id}`);
            // await redisService.keys('user:*:sockets', (err, keys) => {
            //     keys.forEach((key) => {
            //        redisService.srem(key, socket.id);  // Удаляем socket.id из множества
            //     });
            // });
        });


        socket.on("ping", () => {
            socket.emit("pong", {data: []});
        });

        // Отправка сообщения на все сокеты пользователя
        // socket.on('sendMessageToUser', async (userId, message) => {
        //     await redisService.smembers(`user:${userId}:sockets`, (err, socketIds) => {
        //         if (err) {
        //             console.error('Error fetching socket ids:', err);
        //             return;
        //         }
        //
        //         // Отправляем сообщение на все сокеты пользователя
        //         socketIds.forEach((socketId) => {
        //             io.to(socketId).emit('message', message);
        //         });
        //     });
        // });
        //
        // // Пример: пользователь отправляет свой user_id при подключении
        // socket.on('register', async (userId) => {
        //     // Сохраняем связь между user_id и socket.id в Redis
        //     await redisService.sadd(`user:${userId}:sockets`, socket.id);
        //
        //     console.log(`Socket ${socket.id} registered for user ${userId}`);
        // });
    });
    io.on('disconnect', (reason) => {
        console.log('disconnect2222:', reason);

    });

    app.post("/push", requestPushBodyMiddleware, (req, res) => {

        const {channels, message, event, namespace} = req.body;
        let ns = namespace || '/';

        if (channels && message && event) {

            if (ns === '/transaction' && event === 'transaction') {
                const {error} = ValidateTransactionRequest(req.body);
                if (error) {
                    return res.status(400).json({
                        success: false,
                        message: 'Ошибка валидации',
                        entryData: message,
                        errors: error.details.map(err => err.message),
                    });
                }
                // sendMessageWithAck(io, {
                //     channels: channels, event: event, message: message, namespace: ns
                // });
                io.of(ns).to(channels).emit(event, message);
            }else{
                io.of(ns).to(channels).emit(event, message);
            }


            logger.info(`Send to channel:`, {meta: req.body});
            return res.status(200).json({
                success: true,
                message: i18n.__('sendMessageSuccess')
            });
        } else {
            return res.status(400).json({
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
            success: true, message: 'Message sent'
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
                channel: channelName, eventName: eventName, message: message, namespace: namespace
            });


            logger.info(`Sent to channel ${channel}:`, message);
            res.status(200).json({
                success: true, message: i18n.__('sendMessageSuccess')
            });
        } else {
            res.status(400).json({
                success: false, message: i18n.__('channelOrMessageMissing')
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

    server.listen(PORT, process.env.WS_HOST, () => {
        logger.info(`Socket.io сервер запущен на порту ${PORT}`, 'params_test');
    });

}).catch(error => {
    console.log(error);
});

async function shutdown() {
    try {
        logger.info('Завершаем процесс...');
        process.exit(0); // Завершаем процесс с кодом 0 (успешно)
    } catch (error) {
        // Логируем ошибки, если они произошли
        logger.error('Ошибка при удалении ключей:', {meta: error});
        process.exit(1); // Завершаем процесс с кодом 1 (ошибка)
    }
}


process.on('SIGINT', shutdown);   // Ctrl+C
process.on('SIGTERM', shutdown);  // Команда kill
process.on('exit', shutdown);     // Завершение процесса

// Отслеживание необработанных отклонений (unhandledRejection)
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', {meta: {reason: reason}, promise});
    // Если нужно завершить процесс, можно вызвать process.exit(1) или не делать этого:
    shutdown();
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {meta: {error: error.message}, stack: error.stack});
    shutdown();
});
