const logger = require("../utils/logger");
const {authMiddleware} = require("../middleware/auth.middleware");
const redisService = require('../services/redis.service2');

async function transactionNamespace(io) {
    const transactionNamespace = io.of("/transaction");


    transactionNamespace.use(authMiddleware).on("connection", async (socket) => {
        logger.info(`Клиент подключился к /transaction: ${socket.id} / ${socket.decoded.id}`);


        await redisService.set(`connection:${socket.decoded.id}`, socket.id);

        socket.on("ping", () => {
            socket.emit("pong");
        });


        socket.on("subscribe", async (data) => {


            logger.info(`Клиент ${socket.id} подписался на: ${JSON.stringify(data)}`);

            if (data.channel) {
                socket.join(data.channel);


                const exists = await redisService.exists(`subscribe:${data.channel}:${socket.decoded.id}`);
                if (exists === 1) {
                    const subscribeSata = await redisService.hGetAll(`subscribe:${data.channel}:${socket.decoded.id}`);
                    logger.info(`${socket.id} subscribe3:${data.channel}:${socket.decoded.id} redis.hGetAll`);
                } else {
                    logger.info(`${socket.id} subscribe2:${data.channel}:${socket.decoded.id} redis.hSet`);
                    await redisService.hSetAll(`subscribe:${data.channel}:${socket.decoded.id}`, socket.decoded);
                }


                // (async () => {
                //     try {
                //         const exists = await redisClient.exists('subscribe:503');
                //         if (exists === 1) {
                //             const subscribeSata = await redisClient.hGetAll(`subscribe:${socket.decoded.id}`);
                //             console.log('subscribe exists:', subscribeSata.id);
                //         } else {
                //             console.log('subscribe.');
                //             redisClient.hSet(`subscribe:${socket.decoded.id}`, socket.decoded);
                //         }
                //     } catch (error) {
                //         console.error('Error checking key existence:', error);
                //     }
                // })();


                //  redisClient.hSet(`subscribe:${socket.decoded.id}`, socket.decoded);


                logger.info(`${socket.id} Подписан на канал: ${data.channel}`);
            } else {
                logger.info(`${socket.id} Ошибка: Не передан канал в subscribe`);
            }

            socket.on('transaction', (data, callback) => {
                console.log('Получено сообщение с запросом подтверждения:', data);

                // Выполняем какую-то обработку данных...
                // ...

                // Отправляем подтверждение клиенту
                if (callback && typeof callback === 'function') {
                    callback({status: 'accepted', message: 'Сообщение успешно обработано сервером'});
                }
            });

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

            sendUnreadMessages();
        });


        socket.on('disconnect', async () => {
            logger.info(`${socket.id} Пользователь отключен: ${socket.decoded.id}`);
            await redisService.del(`connection:${socket.decoded.id}`);


        });


    });

}

module.exports = {transactionNamespace}