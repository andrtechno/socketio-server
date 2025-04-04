const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");
const jwtPayloadValidate = require("../validators/jwt-payload.validate");

function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET); // Возвращает расшифрованный токен, если он валиден
    } catch (error) {
        return null; // Возвращает null, если токен невалиден
    }
}

//const authMiddleware = async (socket, next) => {
async function authMiddleware (socket, next) {
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
        const {error, value} = jwtPayloadValidate(decoded);

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


module.exports = authMiddleware;