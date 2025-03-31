import dotenv from 'dotenv';
import redis from 'redis';


dotenv.config(); // Load environment variables from .env file

const redisClient = await redis.createClient({
    database: process.env.REDIS_DB,
    socket: {
        host: process.env.REDIS_HOST, // Адрес сервера Redis
        port: process.env.REDIS_PORT,        // Порт сервера Redis
    }
})
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

// await redisClient.connect(); // Асинхронное подключение к Redis

// Запись сообщения в Redis
const messageKey = 'message_key';  // Ключ, по которому будем сохранять сообщение
const messageValue = 'Привет, Redis!'; // Сообщение, которое нужно сохранить

try {
    // Используем команду SET для записи данных
    // await redisClient.set(messageKey, messageValue);
    await redisClient.set('sdskey', 'valsdsue', {
       // EX: 10, //Время жизни
        NX: false
    });


    console.log(`Сообщение "${messageValue}" записано с ключом "${messageKey}"`);


    await redisClient.hSet('test:key:fff', 'field', 'value');

} catch (error) {
    console.error('Ошибка при записи в Redis:', error);
} finally {
    // Закрываем соединение с Redis
    await redisClient.quit();
}