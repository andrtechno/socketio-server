import logger from "../logger.js";
import {getRedisClient} from "../redis_con.js";

export async function transactionNamespace(io) {
    const transactionNamespace = io.of("/transaction");
    const redisClient = await getRedisClient(); // Получаем клиент Redis

    transactionNamespace.on("connection", (socket) => {
        logger.info(`🔗 Клиент подключился к /transaction: ${socket.id}`);
        //console.log("📥 Handshake данные:", socket.handshake);

        socket.on("subscribe", (data) => {
            logger.info(`📩 Клиент подписался на: ${JSON.stringify(data)}`);

            if (data.channel) {
                socket.join(data.channel);
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
                const messages = await redisClient.lRange(`channel:transaction:messages`, 0, -1);

                if (messages) {
                    messages.forEach((message) => {
                        io.of("/transaction").to('transaction').timeout(5000).emit("event", JSON.parse(message), true);
                        logger.info(message);
                    });
                    await redisClient.del(`channel:transaction:messages`); // Очистка списка сообщений
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