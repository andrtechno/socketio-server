import dotenv from 'dotenv';
import redisAdapter from '@socket.io/redis-adapter';
import redis from 'redis';
import logger from './logger.js';

let pubClient, subClient;

/**
 * Функция подключения к Redis с переподключением
 */
async function connectRedis() {
    try {
        logger.info('🔄 Подключение к Redis...');
        pubClient = redis.createClient({
            database: process.env.REDIS_DB,
            socket: {
                host: process.env.REDIS_HOST, // Адрес сервера Redis
                port: process.env.REDIS_PORT,        // Порт сервера Redis
            }
        });



        subClient = pubClient.duplicate();

        // Обработка ошибок и переподключение
        pubClient.on('error', (err) => console.error('❌ Ошибка Redis (pub):', err));
        subClient.on('error', (err) => console.error('❌ Ошибка Redis (sub):', err));

        await Promise.all([pubClient.connect(), subClient.connect()]);
        await pubClient.select(process.env.REDIS_DB);
        await subClient.select(process.env.REDIS_DB);

        logger.info('✅ Redis подключен DB', process.env.REDIS_DB);
        return {pubClient, subClient};
    } catch (err) {
        logger.error('❌ Ошибка подключения к Redis:', err);
        setTimeout(connectRedis, 5000); // Повторное подключение через 5 сек
    }
}

/**
 * Инициализация Redis и подключение к Socket.io
 */
export async function initRedis(io) {
    const clients = await connectRedis();
    if (clients) {
        io.adapter(redisAdapter(clients.pubClient, clients.subClient));
        logger.info('✅ Redis Adapter подключен');
        return clients.pubClient;
    }
}

// module.exports = {initRedis};
