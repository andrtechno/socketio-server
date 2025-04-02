const jwt = require('jsonwebtoken');
const {getRedisClient} = require("./redis_con.js");


function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded; // Возвращает расшифрованный токен, если он валиден
    } catch (error) {
        return null; // Возвращает null, если токен невалиден
    }
}

async function authMiddleware(socket, next) {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Нет токена'));
    }

    try {
        const decoded = verifyToken(token);
        if (!decoded) {
            return next(new Error('invalid token'));
        }
        socket.decoded = decoded; // Сохраняем расшифрованный токен в сокете



        next();
    } catch (err) {
        return next(new Error('Неверный токен'));
    }
}

async function generateToken(user) {
    const token = jwt.sign(user, process.env.JWT_SECRET);
    const redisClient = await getRedisClient(); // Получаем клиент Redis
    await redisClient.set(`token:${token}`, 'valid', { EX: 3600 }); // Храним токен в Redis на 1 час
    return token;
}


async function invalidateToken(token) {
    const redisClient = await getRedisClient(); // Получаем клиент Redis
    await redisClient.del(`token:${token}`);
}

module.exports = {invalidateToken,generateToken,authMiddleware};
