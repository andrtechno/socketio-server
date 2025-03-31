import logger from "../logger.js";
import {getRedisClient} from "./../redis_con.js";
import {authMiddleware} from "../auth.js";

export async function billingNamespace(io) {
    const billingNamespace = io.of("/billing");
    const redisClient = await getRedisClient(); // Получаем клиент Redis

    billingNamespace.use(authMiddleware);

    billingNamespace.on("connection", (socket) => {
        logger.info(`🔗 Клиент подключился к /billing: ${socket.id}`);
        console.log(socket.decoded.userId);

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
                    callback({status: 'accepted', message: 'Сообщение успешно обработано сервером'});
                }
            });

            async function sendUnreadMessages() {
                const messages = await redisClient.lRange(`channel:billing:messages`, 0, -1);

                if (messages) {
                    //console.log("📥 Handshake данные:", socket.handshake);
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
}