import redis from 'redis';
import logger from "./logger.js";

let redisClient;

export function redisConf() {
    redisClient = redis.createClient({
        database: process.env.REDIS_DB,
        socket: {
            host: process.env.REDIS_HOST, // Адрес сервера Redis
            port: process.env.REDIS_PORT, // Порт сервера Redis
        }
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error'));
    return redisClient;
}

async function connectRedis() {

    await redisConf().connect();
    logger.info('Redis подключен');
    return redisClient;
}

export async function getRedisClient() {
    if (!redisClient) {
        return connectRedis();
    }
    return redisClient;
}