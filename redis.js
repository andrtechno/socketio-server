const redis = require('redis');
const logger = require("./logger.js");

let redisClient;

function redisConf() {
    redisClient = redis.createClient({
        database: process.env.REDIS_DB,
        socket: {
            host: process.env.REDIS_HOST, // Адрес сервера Redis
            port: process.env.REDIS_PORT, // Порт сервера Redis
        }
    });

    redisClient.on('error', (err) => logger.error('Redis Client Error'));
    redisClient.on('connect', () => logger.info('Redis Client Connected'));

    return redisClient;
}

async function connectRedis() {
    try {
        await redisConf().connect();
        logger.info('Redis подключен');
        return redisClient;
    } catch (error) {
        logger.error('Ошибка подключения к Redis:', error);
        return null; // Return null in case of error
    }
}

async function getRedisClient() {
    if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis client not available, attempting to reconnect');
        redisClient = await connectRedis();
        if(!redisClient){
            return null;
        }
    }
    return redisClient;
}

/**
 * scanKeys('key:*')
 * @param pattern
 * @returns {Promise<*[]>}
 */
async function scanKeys(pattern) {
    let cursor = 0;
    let keys = [];
    const client = await getRedisClient();
    do {
        const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;
        keys.push(...result.keys);
    } while (cursor !== 0);

    return keys;
}

/**
 * deleteKeysByPattern('key:*')
 * @param pattern
 * @returns {Promise<boolean>}
 */
async function deleteKeysByPattern(pattern) {
    let cursor = 0;
    const client = await getRedisClient();
    do {
        const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;
        if (result.keys.length > 0) {
            await client.del(result.keys);
            logger.info(`Удалены ключи: ${result.keys.join(', ')}`);
        }
    } while (cursor !== 0);

    logger.info('Удаление по шаблону завершено!');
    return true;
}

module.exports = {redisConf, getRedisClient,scanKeys,deleteKeysByPattern}