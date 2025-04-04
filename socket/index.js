const logger = require("../utils/logger");
const redisService = require("../services/redis.service");

function sendMessage(io, {channel = null, eventName, message, namespace}) {
    const emitter = channel ? io.to(channel) : io; // Если есть канал → отправляем в него, иначе всем
    // emitter.timeout(5000).emit(eventName, message, (err, responses) => {
    //     handleResponse(err, responses, {channel, eventName, message});
    // });
    io.of(`/${namespace}`).to(channel).timeout(5000).emit(eventName, message, (err, responses) => {
        handleResponse(err, responses, {channel, eventName, message, namespace});
    });
}

async function compareSubscribersWithOnline(channel) {
    // Получаем список подписчиков

    const subscribers = await redisService.scanKeys(`subscribe:${channel}:*`);
    console.log('Подписчики:', subscribers);
    // Получаем список онлайн пользователей
    const onlineUsers = await redisService.scanKeys(`connection:*`);
    console.log('Онлайн пользователи:', onlineUsers);

    const subscriberIds = subscribers.map(key => key.split(':').pop());
    console.log('Идентификаторы подписчиков:', subscriberIds);

    const onlineUserIds = onlineUsers.map(key => key.split(':').pop());
    console.log('Идентификаторы онлайн пользователей:', onlineUserIds);

    // Сравниваем подписчиков с онлайн пользователями
    return subscriberIds.filter(subscriberId =>
        !onlineUserIds.includes(subscriberId)
    );

}


function handleResponse(err, responses, {channel, eventName, message, namespace}) {

    if (err) {
        logger.info(`Клиент не подтвердил получение события в течение 5 секунд.`);
    } else {
        Promise.resolve()
            .then(() => compareSubscribersWithOnline(channel))
            .then((offlineSubscribers) => {
                console.log('Оффлайн подписчики:', offlineSubscribers);
                const client = redisService;
                offlineSubscribers.forEach((user) => {
                    client.sadd(`missed:messages:${channel}:${user}`, JSON.stringify({
                        message: message,
                        channel: channel,
                        eventName: eventName,
                        namespace: namespace
                    }));
                });
            })
            .catch(error => {
                console.error(error); // Если ошибка, выводим ошибку
            });

        if (responses?.[0]?.status === "accepted") {
            logger.info("Подтвердил получение сообщения:", responses);
        } else {
            logger.info("Не отправил подтверждение! Записываем в Redis.");


        }
    }
}


module.exports = {
    sendMessage
};