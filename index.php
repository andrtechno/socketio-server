<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Socket.IO Client</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>

</head>
<body>
<h1>Socket.IO Client</h1>
<input id="message" type="text" placeholder="Type a message">
<button onclick="sendMessage()">Send</button>

<ul id="messages"></ul>
<button onclick="generateJWT()">Generate JWT</button>
<p id="token"></p>
<script>


    function generateJWT() {
        const SECRET_KEY = "p59uib54jb6u546b4jb5v96lju5946v059lui90";

        // Генерация JWT токена с использованием jsonwebtoken
        const token = jwt.sign({ id: 123 }, SECRET_KEY, { expiresIn: '1h' });

        // Отображаем токен на странице
        document.getElementById("token").textContent = `Generated Token: ${token}`;
        console.log("Generated Token:", token);
    }

    // Подключение к серверу
    const socket = io('http://socket.loc:3000', {
        transports: ["websocket"],
        auth: {
            token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NTAzLCJlbWFpbCI6InNlbWVub3ZAc29ob25ldC51YSIsImZpcnN0X25hbWUiOiJcdTA0MTBcdTA0M2RcdTA0MzRcdTA0NDBcdTA0MzVcdTA0MzkiLCJsYXN0X25hbWUiOiJcdTA0MjFcdTA0MzVcdTA0M2NcdTA0MzVcdTA0M2RcdTA0M2VcdTA0MzIifQ.55Lxy0Ssx--ZNCxn1iY_WS9wWHq6DsvuiyHNdWEycw8'
        }
    });

    socket.on('connect', () => {
        console.log('Successfully connected to the server!');
        console.log('Client ID:', socket.id); // Выводим ID клиента

        socket.emit('subscribe', {channel: 'transaction'});

    });



    // Получение сообщений от сервера
    socket.on('transaction', (msg) => {
        console.log(msg);
        const li = document.createElement('li');
        li.textContent = JSON.stringify(msg);
        document.getElementById('messages').appendChild(li);
    });


    function handleResponse(err, responses) {

        if (err) {
            console.log(`11111111111111111Клиент не подтвердил получение события в течение 5 секунд.`);
        } else {
            console.log(responses);
            if (responses?.[0]?.status === "accepted") {
                console.log("1111111111111111Подтвердил получение сообщения:", responses);
            } else {
                console.log("111111111111111Не отправил подтверждение! Записываем в Redis.");
            }
        }
    }


    // Отправка сообщений
    function sendMessage() {
        const msg = document.getElementById('message').value;
        socket.timeout(5000).emit('transaction', {
            message:{
                "id":"196860222",
                "subscription_id":null,
                "description":msg,
                "account_id":"55500",
                "pay_id":"",
                "amount":"300.00",
                "status":"accepted",
                "status_original":"Approved",
                "pay_account":"cash",
                "pay_system":"cash",
                "type":"cash",
                "created_at":"1740054563",
                "updated_at":"1740054563",
                "provider_id_s":null,
                "created_by":"375",
                "updated_by":"375"
            },
            eventName:'transaction',
            channel:'transaction',
            namespace:'transaction'
        }, handleResponse);
    }
</script>
</body>
</html>

<?php
echo 'Hello';