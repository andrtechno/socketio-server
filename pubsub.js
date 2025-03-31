//Дополнительный Redis Pub/Sub

const { createClient } = require('redis');

const pub = createClient({ url: 'redis://127.127.126.45:6379' });
const sub = pub.duplicate();

Promise.all([pub.connect(), sub.connect()])
    .then(() => {
        console.log('Redis Pub/Sub подключен');

        // Подписка на канал
        sub.subscribe('global', (message) => {
            console.log('Получено сообщение из Redis:', message);
        });
    })
    .catch(err => console.error('Ошибка Redis:', err));

module.exports = { pub, sub };
