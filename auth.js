const jwt = require('jsonwebtoken');
const {getRedisClient} = require("./redis_con.js");
const Joi = require('joi');
const logger = require("./logger.js");

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





        //Validate jwt payload data
        const schema = Joi.object({
            id: Joi.number().integer().required(),
            email: Joi.string().email().required(),
            first_name: Joi.string().min(1).required(),
            last_name: Joi.string().min(1).required(),
        });

        const { error } = schema.validate(decoded, { abortEarly: false });

        if (error) {
            console.log("Ошибки валидации:", error.details.map(err => err.message));
            logger.error("Ошибки валидации:");
            return next(new Error('Ошибки валидации'));
        } else {
            socket.decoded = decoded; // Сохраняем расшифрованный токен в сокете
            next();
        }





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
