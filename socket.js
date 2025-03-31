//Обработка событий
import logger from './logger.js';

export function socketHandler(io, redisClient) {
    const billingNamespace = io.of("/billing");

    billingNamespace.on("connection", (socket) => {
        logger.info(`🔗 Клиент подключился к /billing: ${socket.id}`);
        //console.log("📥 Handshake данные:", socket.handshake);

        socket.on("subscribe", (data) => {
            logger.info(`📩 Клиент подписался на: ${JSON.stringify(data)}`);

            if (data.channel) {
                socket.join(data.channel);
                redisClient.set(`subscribe:${socket.id}`, data.channel);
                logger.info(`✅ Подписан на канал: ${data.channel}`);
            } else {
                logger.info("❌ Ошибка: Не передан канал в subscribe");
            }

            socket.on('event', (data, callback) => {
                console.log('Получено сообщение с запросом подтверждения:', data);

                // Выполняем какую-то обработку данных...
                // ...

                // Отправляем подтверждение клиенту
                if (callback && typeof callback === 'function') {
                    callback({status: 'ok', message: 'Сообщение успешно обработано сервером'});
                }
            });

            async function sendUnreadMessages() {
                const messages = await redisClient.lRange(`channel:billing:messages`, 0, -1);

                if (messages) {
                    messages.forEach((message) => {
                      //  io.of("/billing").to('billing').emit("event", JSON.parse(message));


                        io.of("/billing").to('billing').timeout(5000).emit("event", JSON.parse(message), (err, responses) => {
                            if (err) {
                                logger.info('the client did not acknowledge the event in the given delay');
                            } else {
                                if (responses[0] && responses[0].status === "accepted") {
                                    logger.info("Подтвердил получение сообщения:", responses);
                                } else {
                                    logger.info("Не отправил подтверждение! записываем в Redis");
                                    redisClient.rPush(`channel:billing:messages`, JSON.stringify(message));
                                }
                            }
                        });


                        logger.info(message);
                    });
                    await redisClient.del(`channel:billing:messages`); // Очистка списка сообщений
                }
                //await redisClient.lSet(`channel:billing:messages`, 4, "TO_DELETE");
                // Удаляем первый найденный "TO_DELETE"
                //await redisClient.lRem(`channel:billing:messages`, 1, "TO_DELETE");


            }

            sendUnreadMessages();
        });


        //const channel = socket.handshake; // Получаем канал из параметров подключения


    });

    io.on('connection', (socket) => {
        logger.info(`Пользователь подключен: ${socket.id}`);
        redisClient.set(`connection:${socket.id}`, 'true');

        // Событие для отправки сообщений
        // socket.on('message', (data) => {
        //     console.log(`Сообщение от ${socket.id}:`, data);
        //     io.emit('message', { user: socket.id, text: data });
        // });


        // Отключение пользователя
        socket.on('disconnect', () => {
            logger.info(`Пользователь отключен: ${socket.id}`);
            redisClient.del(`connection:${socket.id}`);
        });


    });
};
