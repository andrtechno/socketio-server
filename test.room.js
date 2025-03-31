const { Server: WsServer } = require("socket.io");


const socket = io("http://localhost:3000"); // Replace with your server URL

// 🔗 Подключаемся к комнате
socket.emit('joinRoom', 'room1');

// 📩 Отправляем сообщение в комнату
socket.emit('roomMessage', { room: 'room1', message: 'Привет, комната!' });

// 📨 Получаем сообщения
socket.on('message', (data) => {
    console.log(`Новое сообщение: ${data.user}: ${data.text}`);
});