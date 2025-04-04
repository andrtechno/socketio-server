const redisService = require("../services/redis.service");
const {createAdapter} = require("@socket.io/redis-adapter");
const logger = require("../utils/logger");

/**
 * Подключает Redis Adapter к Socket.IO серверу
 * @param {import('socket.io').Server} io
 */
async function setupRedisAdapter(io) {
    await redisService.init();

    const pubClient = redisService.getPubClient();
    const subClient = redisService.getSubClient();

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Redis Adapter успешно установлен для Socket.IO');

    //Удаляем подключение
    await redisService.deleteKeysByPattern('connection:*');

}

module.exports = setupRedisAdapter;