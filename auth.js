import { isValidToken } from './utils.js';

import jwt from 'jsonwebtoken';
import {getRedisClient} from "./redis_con.js";
export async function authMiddleware(socket, next) {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Нет токена'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const redisClient = await getRedisClient(); // Получаем клиент Redis
        const isValid = await redisClient.get(`token:${token}`);

        if (!isValid) {
            return next(new Error('Неверный токен или токен истек'));
        }

        socket.user = decoded; // Добавляем данные пользователя в объект socket
        next();
    } catch (err) {
        return next(new Error('Неверный токен'));
    }
}

export async function generateToken(user) {
    const token = jwt.sign(user, process.env.JWT_SECRET);
    const redisClient = await getRedisClient(); // Получаем клиент Redis
    await redisClient.set(`token:${token}`, 'valid', { EX: 3600 }); // Храним токен в Redis на 1 час
    return token;
}


export async function invalidateToken(token) {
    const redisClient = await getRedisClient(); // Получаем клиент Redis
    await redisClient.del(`token:${token}`);
}