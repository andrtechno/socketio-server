const logger = require("../utils/logger");
const {getRedisClient} = require("../services/redis.service");
const {authMiddleware} = require("../middleware/auth.middleware");

async function billingNamespace(io) {
    const billingNamespace = io.of("/billing");
    const redisClient = await getRedisClient(); // Получаем клиент Redis


    billingNamespace.use(authMiddleware).on("connection", (socket) => {
        logger.info(`Клиент подключился к /billing: ${socket.id} / ${socket.decoded.id}`);


        getRedisClient().then((redis) => {
            redis.hSet(`connection:${socket.id}`, socket.decoded);

            socket.on("subscribe", (data) => {
                logger.info(`Клиент ${socket.id} подписался на: ${JSON.stringify(data)}`);

                if (data.channel) {
                    socket.join(data.channel);


                 //   redis.del(`offline:billing:${socket.decoded.id}`);

                    //   getRedisClient().then((redis) => {

                    // redis.set(`connection:${socket.id}`,JSON.stringify(socket.decoded));


                    const exists = redis.exists(`subscribe:${data.channel}:${socket.decoded.id}`);
                    if (exists === 1) {
                        const subscribeSata = redis.hGetAll(`subscribe:${data.channel}:${socket.decoded.id}`);
                        logger.info(`${socket.id} subscribe3:${data.channel}:${socket.decoded.id} redis.hGetAll`);
                    } else {
                        logger.info(`${socket.id} subscribe2:${data.channel}:${socket.decoded.id} redis.hSet`);
                        redis.hSet(`subscribe:${data.channel}:${socket.decoded.id}`, socket.decoded);
                    }
                    //    });


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


                    logger.info(`✅ ${socket.id} Подписан на канал: ${data.channel}`);
                } else {
                    logger.info(`❌ ${socket.id} Ошибка: Не передан канал в subscribe`);
                }

                socket.on('event', (data, callback) => {
                    console.log('Получено сообщение с запросом подтверждения:', data);

                    // Выполняем какую-то обработку данных...
                    // ...

                    // Отправляем подтверждение клиенту
                    if (callback && typeof callback === 'function') {
                        callback({status: 'accepted', message: 'Сообщение успешно обработано сервером'});
                    }
                });

                async function sendUnreadMessages() {
                    const messages = await redisClient.lRange(`channel:billing:messages`, 0, -1);

                    if (messages) {
                        messages.forEach((message) => {


                            // io.of("/billing").to('billing').timeout(5000).emit("event", JSON.parse(message), (err, responses) => {
                            //     if (err) {
                            //         logger.info('2 the client did not acknowledge the event in the given delay');
                            //         redisClient.rPush(`channel:billing:messages`, JSON.stringify(message));
                            //     } else {
                            //         if (responses[0] && responses[0].status === "accepted") {
                            //             logger.info("Подтвердил получение сообщения:", responses);
                            //         } else {
                            //             logger.info("Не отправил подтверждение! записываем в Redis");
                            //             redisClient.rPush(`channel:billing:messages`, JSON.stringify(message));
                            //         }
                            //     }
                            // });
                            io.of("/billing").to('billing').timeout(5000).emit("event", JSON.parse(message), true);

                            logger.info(message);
                        });
                        //await redisClient.del(`channel:billing:messages`); // Очистка списка сообщений
                    }


                    //await redisClient.lSet(`channel:billing:messages`, 4, "TO_DELETE");
                    // Удаляем первый найденный "TO_DELETE"
                    //await redisClient.lRem(`channel:billing:messages`, 1, "TO_DELETE");


                }

               // sendUnreadMessages();
            });


            socket.on('disconnect', () => {
                logger.info(`${socket.id} Пользователь отключен: ${socket.decoded.id}`);
                redisClient.del(`connection:${socket.id}`);


            });
        });


    });

}

module.exports = {billingNamespace}