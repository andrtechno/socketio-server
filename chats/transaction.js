const logger = require("../utils/logger");
const {authMiddleware} = require("../middleware");
const redisService = require('../services/redis.service');

async function transactionNamespace(io) {
    const transactionNamespace = io.of("/transaction");


    transactionNamespace.use(authMiddleware).on("connection", async (socket) => {
        logger.info(`Клиент подключился к /transaction: ${socket.id} / ${socket.decoded.id}`);


        await redisService.set(`ns.transaction:connection:${socket.decoded.id}`, socket.id);

        socket.on("ping", () => {
            socket.emit("pong");
        });


        socket.on("subscribe", async (channels) => {


            logger.info(`Клиент ${socket.id} подписался на`);

            if (channels) {
                socket.join(channels);
                const list = channels.join(channels, ', ');


                await Promise.all(channels.map(async (channel) => {
                    const exists = await redisService.exists(`subscribe:${channel}:${socket.decoded.id}`);
                    if (exists === 1) {
                        const subscribeSata = await redisService.hGetAll(`subscribe:${channel}:${socket.decoded.id}`);
                        logger.info(`${socket.id} subscribe3:${channel}:${socket.decoded.id} redis.hGetAll`);
                    } else {
                        logger.info(`${socket.id} subscribe2:${channel}:${socket.decoded.id} redis.hSet`);
                        await redisService.hSetAll(`subscribe:${channel}:${socket.decoded.id}`, socket.decoded);
                    }

                    logger.info(`${socket.id} Подписан на канал(ы): ${channel}`);
                }));

            } else {
                logger.info(`${socket.id} Ошибка: Не передан канал в subscribe`);
            }

            // socket.on('transaction', (data, callback) => {
            //     console.log('Получено сообщение с запросом подтверждения:', data);
            //
            //     // Выполняем какую-то обработку данных...
            //     // ...
            //
            //     // Отправляем подтверждение клиенту
            //     if (callback && typeof callback === 'function') {
            //         callback({status: 'accepted', message: 'Сообщение успешно обработано сервером'});
            //     }
            // });

            async function sendUnreadMessages() {
                const key = `missed:messages:transaction:${socket.decoded.id}`;
                const messages = await redisService.smembers(key);
                console.log(messages);
                if (messages) {
                    messages.forEach((message) => {
                        io.of(`/transaction`).to('transaction').timeout(5000).emit('transaction', message, true);
                    });
                    await redisService.del(key); // Очистка списка сообщений
                }
            }

            await sendUnreadMessages();
        });


        socket.on('disconnect', async () => {
            logger.info(`${socket.id} Пользователь отключен: ${socket.decoded.id}`);
            await redisService.del(`ns.transaction:connection:${socket.decoded.id}`);
        });
    });
}

module.exports = {transactionNamespace}