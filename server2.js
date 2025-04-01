//Основной сервер
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import {Server} from 'socket.io';
import fs from 'fs';
import logger from './logger.js';
import {billingNamespace} from "./chats/billing.js";
import {createAdapter} from '@socket.io/redis-adapter';
import {getRedisClient, redisConf} from "./redis_con.js";
import {
    authMiddleware,
} from "./auth.js";
import {body, validationResult} from 'express-validator';
import {validateUserAuth} from "./validators/UserAuth.js";
import {exampleUsage, getUserByToken, poolExample} from "./database.js";
import jwt from "jsonwebtoken";
import { instrument } from '@socket.io/admin-ui';
import path from "path";
import { fileURLToPath } from 'url';

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
        //origin: "*",
        origin: ["http://socket.loc:3000"],
        methods: ["GET", "POST"],
        credentials:true
    }
});



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// HTTP API для отправки сообщений в WebSocket
app.use(express.json());

// app.get('/admin', (req, res, next) => {
//     res.send(express.static('./node_modules/@socket.io/admin-ui/ui/dist'))
// })

app.use('/admin', express.static(path.join(__dirname, 'node_modules', '@socket.io/admin-ui', 'ui', 'dist')));

// app.use(express.static('./node_modules/@socket.io/admin-ui/ui/dist'));
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

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // No token

    console.log(token);


    const redisClient = await getRedisClient();
   // const pwd = await redisClient.get(`auth:${username}`);


   // redisClient.set(`auth:${username}`, token);
      //  req.user = user; // Add user data to the request object
        next(); // Proceed to the next middleware or route handler
    // jwt.verify(token, secretKey, (err, user) => {
    //     if (err) return res.sendStatus(403); // Invalid token

    // });
}

Promise.resolve().then(setupRedisAdapter).then(() => {


    //Middleware
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
                            logger.info("Не отправил подтверждение! записываем в Redis");
                            //redisClient.rPush(`channel:${channel}:messages`, JSON.stringify(message));
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



