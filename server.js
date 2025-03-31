require("dotenv").config();


const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const jwt = require('jsonwebtoken');
const { Server: WsServer } = require("socket.io");
const axios = require("axios");

const app = express();

const PORT = process.env.WS_PORT || 3000;
const HOST = process.env.WS_HOST || '0.0.0.0';

const users = { "user@example.com": "password123" };
const SECRET_KEY = process.env.JWT_SECRET || "testkey";


const API_URL = "http://manager.loc/api"; // 🔹 API для проверки токена


// Замените на путь к вашим SSL-файлам
const options = {
    key: fs.readFileSync("C:\\OSPanel\\home\\socket.loc\\key.pem"),  // Для теста: самоподписанный ключ
    cert: fs.readFileSync("C:\\OSPanel\\home\\socket.loc\\cert.pem") // Для теста: самоподписанный сертификат
};


const server = http.createServer(options, app);
const io = new WsServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8 // 100 MB
});


const verifyToken = (token) => {
    try {
        // Здесь можно использовать секретный ключ для проверки токена
        return jwt.verify(token, SECRET_KEY); // Замените на ваш секретный ключ
    } catch (err) {
        return null;
    }
};




io.use((socket, next) => {
    const user = socket.handshake.auth.user;
    const token = socket.handshake.auth.token;
    console.log(user, token);
    // do something with data
    next();
});




// HTTP API для отправки сообщений в WebSocket
app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).send("👌");
});

app.post("/send_message", (req, res) => {
    const { channel, message } = req.body;

    // Если канал и сообщение указаны, отправляем сообщение в канал
    if (channel && message) {
        io.to(channel).emit("new_message", message);
        io.to(channel).emit("ns_message", message);
        console.log(`Sent to channel ${channel}:`,message);
        //res.status(200).send("Message sent");
        res.status(200).json({success: true});
    } else {
        //res.status(400).send("Channel and message are required");
        res.status(400).json({success: false});
    }
});

function authenticateBearerHTTP(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer "

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Attach user data
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: "Invalid token" });
    }
}
//"/billing/send_message", authenticateBearerHTTP, (req, res)
app.post("/billing/send_message", (req, res) => {
    const { channel, message } = req.body;

    // Если канал и сообщение указаны, отправляем сообщение в канал
    if (channel && message) {
        io.of("/billing").to(channel).emit("event", message);
       // io.of("/billing").to(channel).emit("ns_message", message);
        console.log(`Sent to channel ${channel}:`,message);
        //res.status(200).send("Message sent");
        res.status(200).json({success: true});
    } else {
        //res.status(400).send("Channel and message are required");
        res.status(400).json({success: false});
    }
});

// app.post("/validate-token", (req, res) => {
//     const { token } = req.body;
//
//     if (!token) return res.status(400).json({ success: false, message: "No token provided" });
//
//     try {
//         const decoded = jwt.verify(token, SECRET_KEY);
//         res.json({ success: true, user: decoded });
//     } catch (error) {
//         res.status(401).json({ success: false, message: "Invalid token" });
//     }
// });

const billingNamespace = io.of("/billing");
billingNamespace.use(async (socket, next) => {
    // const authHeader = socket.handshake.auth?.token;
    // console.log('Auth', authHeader);
    // if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //     return next(new Error("Authentication required"));
    // }
    //
    // const token = authHeader.split(" ")[1]; // Extract token after "Bearer"
    //
    // try {
    //     const decoded = jwt.verify(token, SECRET_KEY);
    //     socket.user = decoded; // Attach user data
    //     console.log('Auth token:',socket.user);
    //     next();
    // } catch (error) {
    //     console.log('Auth error');
    //     return next(new Error("Invalid token"));
    // }



    // if (socket.handshake && socket.handshake.auth) {
    //     const user = socket.handshake.auth.user;
    //     const token = socket.handshake.auth.token;
    //     if (user && token) {
    //         this.log('auth token', token);
    //         // do some security check with token
    //         // for example:
    //         if (user === 'random@example.com' && token === 'my-secret-token') {
    //             console.log('successfully authenticated');
    //             next();
    //         } else {
    //             next(new Error('invalid credentials'));
    //         }
    //     } else {
    //         next(new Error('missing auth from the handshake'));
    //     }
    // } else {
    //     next();
    // }


    // const response = await axios.post(API_AUTH_URL+'/user/login', { username: "test2@sohonet.ua", password: "SoHojP20230805" });
    // console.log(response);
    //
    // if(response.data.access_token){
    //     socket.user = response.data.user; // Сохраняем пользователя в сокете
    //     return next();
    // }
    //
    //
    // if (!token) {
    //     return next(new Error("Authentication error: Token required"));
    // }
    //
    // try {
    //     const decoded = jwt.verify(token, SECRET_KEY); // Проверяем токен
    //     socket.user = decoded; // Добавляем данные пользователя в сокет
    //     console.log(`🔑 Клиент подписался на: ${socket.user}`);
    //     next();
    // } catch (err) {
    //     console.log(`Authentication error: Invalid token`);
    //     return next(new Error("Authentication error: Invalid token"));
    // }


    next();
});

billingNamespace.on("connection", (socket) => {

    console.log(`🔗 Клиент подключился к /billing: ${socket.id}`);
    //console.log("📥 Handshake данные:", socket.handshake);

    socket.on("subscribe", (data) => {
        console.log(`📩 Клиент подписался на: ${JSON.stringify(data)}`);

        if (data.channel) {
            socket.join(data.channel);
            console.log(`✅ Подписан на канал: ${data.channel}`);
        } else {
            console.log("❌ Ошибка: Не передан канал в subscribe");
        }
    });

    socket.on('login', async ({ username, password }) => {
        try {
            // Отправляем запрос к вашему API для получения токена
            const response = await axios.post(API_URL+'/user/login', { username, password });

            // Проверяем, получен ли токен
            if (response.data.access_token) {
                // Подтверждаем успешную авторизацию
                socket.emit('login_success', { message: 'Login successful' });
            } else {
                socket.emit('login_failure', { message: 'Login failed' });
            }
        } catch (error) {
            console.error(error);
            socket.emit('login_failure', { message: 'Error during login' });
        }
    });

    socket.on('check_token', (token) => {
        const user = verifyToken(token);
        if (user) {
            socket.emit('token_valid', { message: 'Token is valid', user });
        } else {
            socket.emit('token_invalid', { message: 'Token is invalid' });
        }
    });

    //Отправление каждые 3сек. сообщение
    // setInterval(() => {
    //     const message = `🔥 Новость в канале 'news' в ${new Date().toLocaleTimeString()}`;
    //     billingNamespace.to("billing").emit("new_message", message);
    //     console.log(`📨 Отправлено сообщение: ${message}`);
    // }, 3000);

    socket.on("disconnect", () => {
        console.log(`❌ Клиент отключился: ${socket.id}`);
    });
});



// Обработчик подключений
io.on("connection", (socket) => {

    console.log("⚡ Новый пользователь подключился:", socket.id);

    // Получение и пересылка сообщений
    socket.on("message", (msg) => {
        console.log("💬 Сообщение:", msg);
        io.emit("chat message", msg); // Отправляем всем
    });

    socket.on("subscribe", (channel) => {
        console.log(`✅ Client subscribed to channel: ${channel}`);
        socket.join(channel); // Клиент "подписывается" на канал
    });


    // socket.on("send_message", (data) => {
    //     console.log('send new_message:', data);
    //     io.to(data.channel).emit("new_message", data.message); // Отправляем сообщение в канал
    // });


    socket.on("upload", (file, callback) => {
        console.log(file); // <Buffer 25 50 44 ...>

        // save the content to the disk, for example
        // fs.writeFile("/tmp/upload", file, (err) => {
        //     callback({ message: err ? "failure" : "success" });
        // });
    });


    // Обработка отключения пользователя
    socket.on("disconnect", () => {
        console.log("❌ Пользователь отключился:", socket.id);
    });
});

// Запуск сервера

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('Address in use, retrying...');
        setTimeout(() => {
            server.close();
            server.listen(PORT, HOST);
        }, 1000);
    }
});
server.listen(PORT, HOST, () => {
    console.log(`🚀 Сервер запущен на ws://socket.loc:${PORT}, http://socket.loc:${PORT}`);
});




async function login() {
    const response = await fetch("https://manager.sohonet.ua/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "test2@sohonet.ua", password: "SoHojP20230805" }),
    });

    const data = await response.json();
    if (response.ok) {
        localStorage.setItem("token", data.access_token);
        //connectToBillingNamespace(data.access_token);
    } else {
        console.error("Login failed:", data.message);
    }
}