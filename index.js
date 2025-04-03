//Основной сервер
require('dotenv').config();
const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const logger = require('./logger.js');
const {billingNamespace} = require("./chats/billing.js");
const {transactionNamespace} = require("./chats/transaction");
const {createAdapter} = require('@socket.io/redis-adapter');
const {getRedisClient, redisConf, deleteKeysByPattern} = require("./redis.js");
const {
    authMiddleware,
} = require("./auth.js");
const jwt = require("jsonwebtoken");
const {instrument} = require('@socket.io/admin-ui');
const path = require("path");
const validateBillingBody = require("./validators/requests/ValidateBillingBody");
const ValidateTransactionRequest = require("./validators/requests/ValidateTransactionRequest");


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
    //key: fs.readFileSync("C:\\OSPanel\\home\\socket.loc\\key.pem"),  // Для теста: самоподписанный ключ
    //cert: fs.readFileSync("C:\\OSPanel\\home\\socket.loc\\cert.pem"), // Для теста: самоподписанный сертификат
     pingTimeout: 10000, // Увеличить таймаут пинга
     pingInterval: 5000,
};
const server = http.createServer(options, app);
const io = new Server(server, {
    cors: {
        //origin: "*",
        origin: ["http://socket.loc:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
let pubClient, subClient;

// HTTP API для отправки сообщений в WebSocket
app.use(express.json());

// HTTP Admin panel
app.use('/admin', express.static(path.join(__dirname, 'node_modules', '@socket.io/admin-ui', 'ui', 'dist')));


async function setupRedisAdapter() {
    pubClient = redisConf(); // Получаем клиент Redis
    subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    if (pubClient && subClient) {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Redis Adapter подключен');
    }
}

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // No token


    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.decoded = user; // Add user data to the request object
    });


    const {message} = req.body;
    const channel = req.params.channel; // Получаем параметр из URL

    if (channel === 'billing') {
        const {error, value} = validateBillingBody(req.body);

        if (error) {
            logger.error("Ошибка валидации:");
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: error.details.map(err => err.message)
            });
        }
    }


    if (channel === 'transaction') {
        const {error, value} = ValidateTransactionRequest(req.body);

        if (error) {
            logger.error("Ошибка валидации:");
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: error.details.map(err => err.message)
            });
        }
    }

    console.log('Proceed to the next middleware or route handler');
    next(); // Proceed to the next middleware or route handler

}

Promise.resolve().then(setupRedisAdapter).then(() => {


    //Common Middleware
    io.use(authMiddleware);

    // Интеграция Socket.IO Admin
    instrument(io, {
        auth: false,
        mode: "development"
        //namespaceName: "/admin"
    });
    // io.on("connection", (socket) => {
    //     logger.info(`🔗 Клиент подключился к / ${socket.id} / ${socket.decoded.id}`);
    // });


    io.on("connection", (socket) => {
        logger.info(`🔗 Клиент подключился к: ${socket.id} / ${socket.decoded.id}`);


        socket.on("subscribe", (data) => {
            logger.info(`📩 Клиент ${socket.id} подписался на: ${JSON.stringify(data)}`);

            if (data.channel) {
                socket.join(data.channel);
                logger.info(`✅ ${socket.id} Подписан на канал: ${data.channel}`);
            } else {
                logger.info(`❌ ${socket.id} Ошибка: Не передан канал в subscribe`);
            }

        });


        socket.on('disconnect', () => {
            logger.info(`${socket.id} Пользователь отключен: ${socket.decoded.id}`);
        });

        socket.on("ping", () => {
            socket.emit("pong");
        });
    });


    function handleResponse(err, responses) {
        if (err) {
            logger.info('Клиент не подтвердил получение события в течение 5 секунд.');
        } else {
            if (responses?.[0]?.status === "accepted") {
                logger.info("Подтвердил получение сообщения:", responses);
            } else {
                logger.info("Не отправил подтверждение! Записываем в Redis.");
            }
        }
    }


    function sendMessage(io, { channel = null, eventName, message }) {
        const emitter = channel ? io.to(channel) : io; // Если есть канал → отправляем в него, иначе всем

        emitter.timeout(5000).emit(eventName, message, handleResponse);
    }


    app.post("/send", authenticateToken, (req, res) => {

        const {channel, message,eventName} = req.body;

        // Если канал и сообщение указаны, отправляем сообщение в канал
        if (channel && message) {

            let channelName =null;
            if (channel === 'billing') {
                channelName=channel;
            } else if (channel === 'transaction') {
                channelName=channel;
            }
            // io.timeout(5000);
            // io.emit(eventName, message, handleResponse);


            sendMessage(io, {
                channel: channelName,
                eventName: eventName,
                message: message
            });

          //  io.to(channel).timeout(5000).emit(eventName, message, handleResponse);


            logger.info(`Sent to channel ${channel}:`, message);
            res.status(200).json({success: true});
        } else {
            res.status(400).json({success: false});
        }
    });


    // transactionNamespace(io).then(r => {
    //
    //     app.post("/:channel/send", authenticateToken, (req, res) => {
    //
    //         const channel = req.params.channel; // Получаем параметр из URL
    //
    //         const {message,namespace} = req.body;
    //
    //
    //         // Если канал и сообщение указаны, отправляем сообщение в канал
    //         if (channel && message) {
    //             io.of(`/${namespace}`).to(channel).timeout(5000).emit("transaction", message, (err, responses) => {
    //                 if (err) {
    //                     logger.info('the client did not acknowledge the event in the given delay');
    //                 } else {
    //                     if (responses[0] && responses[0].status === "accepted") {
    //                         logger.info("Подтвердил получение сообщения:", responses);
    //                     } else {
    //                         logger.info("Не отправил подтверждение! записываем в Redis");
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


    // app.post("/register", validateUserAuth, async (req, res) => {
    //
    //     // try {
    //     //     console.log(req.body);
    //     //     JSON.parse(JSON.parse(req.body));
    //     // } catch (e) {
    //     //     logger.error(`Error json ${e.message}`);
    //     //     res.status(500).json({error: true, message: e.message});
    //     // }
    //
    //     const errors = validationResult(req);
    //     const {username, password} = req.body;
    //
    //
    //     // Если канал и сообщение указаны, отправляем сообщение в канал
    //     if (!errors.isEmpty()) {
    //         return res.status(400).json({errors: errors.array()});
    //     }
    //
    //
    //     //Здесь делаем проверку с БД менеджера.
    //
    //
    //     const redisClient = await getRedisClient();
    //     const pwd = await redisClient.get(`auth:${username}`);
    //     if (pwd) {
    //         console.log(pwd);
    //         if (pwd !== password) {
    //             //Если пользователь найден и пароль НЕ совпадает
    //             return res.status(401).json({
    //                 error: true,
    //                 message: "Не верный пароль",
    //             });
    //         } else {
    //             //Если пользователь найден и пароль совпадают, не чего не делаем
    //             return res.status(202).json({
    //                 success: true,
    //             });
    //         }
    //     } else {
    //
    //     }
    //
    //
    //     //Регистрация пользователя в Redis.
    //     //redisClient.set(`auth:${username}`, password);
    //
    //     res.status(200).json({
    //         success: true,
    //         message: "✅ Пользователь успешно зарегистрирован",
    //         //  username: username,
    //         // password: password
    //     });
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
        logger.info(`Socket.io сервер запущен на порту ${PORT}`, 'ffff');
    });

});

async function shutdown() {
    logger.info('Завершаем процесс...');

    try {
        const redis = await getRedisClient();
        await deleteKeysByPattern(`connection:*`); //Удаляем всех кто был подключен
        redis.quit(); // Закрываем соединение с Redis

        logger.info('Redis соединение закрыто.');
    } catch (err) {
        logger.error('Ошибка при закрытии Redis:', err);
    }

    process.exit(0);
}


process.on('SIGINT', shutdown);   // Ctrl+C
process.on('SIGTERM', shutdown);  // Команда kill
process.on('exit', shutdown);     // Завершение процесса
process.on('uncaughtException', (err) => {
    logger.error('Необработанное исключение:', err);
    shutdown();
});



