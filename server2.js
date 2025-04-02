//Основной сервер
require('dotenv').config();
const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const fs = ('fs');
const logger = require('./logger.js');
const {billingNamespace} = require("./chats/billing.js");
const {createAdapter} = require('@socket.io/redis-adapter');
const {getRedisClient, redisConf} = require("./redis_con.js");
const {
    authMiddleware,
} = require("./auth.js");
const {body, validationResult} = require('express-validator');
const {validateUserAuth} = require("./validators/UserAuth.js");
const {exampleUsage, getUserByToken, poolExample} = require("./database.js");
const jwt = require("jsonwebtoken");
const { instrument } = require('@socket.io/admin-ui');
const path = require("path");
const { fileURLToPath } = require('url');
const {scanKeys, deleteKeysByPattern} = require("./redis_con");


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
    // pingTimeout: 60000, // Увеличить таймаут пинга
    // pingInterval: 25000,
};
const server = http.createServer(options, app);
const io = new Server(server, {
    cors: {
        //origin: "*",
        origin: ["http://socket.loc:3000"],
        methods: ["GET", "POST"],
        credentials:true
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

    console.log(token);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.decoded = user; // Add user data to the request object
    });

   // const redisClient = await getRedisClient();
   // const pwd = await redisClient.get(`auth:${username}`);


   // redisClient.set(`auth:${username}`, token);
      //  req.user = user; // Add user data to the request object
        next(); // Proceed to the next middleware or route handler
    // jwt.verify(token, secretKey, (err, user) => {
    //     if (err) return res.sendStatus(403); // Invalid token

    // });
}

Promise.resolve().then(setupRedisAdapter).then(() => {


    //Common Middleware
    //io.use(authMiddleware);

    // Интеграция Socket.IO Admin
    instrument(io, {
        auth: false,
        mode:"development"
        //namespaceName: "/admin"
    });



//transactionNamespace(io);
    billingNamespace(io).then(r => {

        app.post("/send", authenticateToken, (req, res) => {
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




                            scanKeys('subscribe:billing:*')
                                .then(list => {

                                    list.forEach((item) => {
                                        logger.info(item);
                                    });

                                })
                                .catch(console.error);


                            getRedisClient().then((redis)=>{
                                // redis.rPush(`channel:${channel}:messages`, JSON.stringify(message));



                                const data = {
                                    channel: channel,
                                    message: JSON.stringify(message)
                                }
                                redis.hSet(`channel:${channel}:messages`, data);
                            });






                            logger.info("Не отправил подтверждение! записываем в Redis");

                        }
                    }
                });


                logger.info(`Sent to channel ${channel}:`, message);
                res.status(200).json({success: true});
            } else {
                res.status(400).json({success: false});
            }
        });

    });


    app.post("/register", validateUserAuth, async (req, res) => {

        // try {
        //     console.log(req.body);
        //     JSON.parse(JSON.parse(req.body));
        // } catch (e) {
        //     logger.error(`Error json ${e.message}`);
        //     res.status(500).json({error: true, message: e.message});
        // }

        const errors = validationResult(req);
        const {username, password} = req.body;


        // Если канал и сообщение указаны, отправляем сообщение в канал
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }


        //Здесь делаем проверку с БД менеджера.


        const redisClient = await getRedisClient();
        const pwd = await redisClient.get(`auth:${username}`);
        if (pwd) {
            console.log(pwd);
            if (pwd !== password) {
                //Если пользователь найден и пароль НЕ совпадает
                return res.status(401).json({
                    error: true,
                    message: "Не верный пароль",
                });
            } else {
                //Если пользователь найден и пароль совпадают, не чего не делаем
                return res.status(202).json({
                    success: true,
                });
            }
        } else {

        }


        //Регистрация пользователя в Redis.
        //redisClient.set(`auth:${username}`, password);

        res.status(200).json({
            success: true,
            message: "✅ Пользователь успешно зарегистрирован",
          //  username: username,
           // password: password
        });
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




// Пример регистрации и логина (для тестирования)
//     registerUser('test_user', 'password123').then((user) => {
//         loginUser('test_user', 'password123').then((user) => {
//             if (user) {
//                 generateAccessToken({ userId: 123, username: user.username }).then((accessToken) => {
//                     generateRefreshToken({ userId: 123, username: user.username }).then((refreshToken) => {
//                         console.log('Access Token:', accessToken);
//                         console.log('Refresh Token:', refreshToken);
//
//                         refreshAccessToken(refreshToken).then((newAccessToken) => {
//                             if (newAccessToken) {
//                                 console.log('Новый Access Token:', newAccessToken);
//                             } else {
//                                 console.log('Refresh token недействителен');
//                             }
//                         });
//                     });
//                 });
//             } else {
//                 console.log('Неверный логин или пароль');
//             }
//         });
//     });



