import redis from 'redis';

let redisClient;

async function connectRedis() {
    redisClient = redis.createClient({
        database: process.env.REDIS_DB,
        socket: {
            host: process.env.REDIS_HOST, // Адрес сервера Redis
            port: process.env.REDIS_PORT,        // Порт сервера Redis
        }
    });

    redisClient.on('error', (err) => console.error('Redis Client Error', err));

    await redisClient.connect();
    console.log('Redis подключен');
    return redisClient;
}

export async function getRedisClient() {
    if (!redisClient) {
        return connectRedis();
    }
    return redisClient;
}