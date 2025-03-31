// server/auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getRedisClient } from './redis_con.js';

const ACCESS_TOKEN_SECRET = 'your_access_token_secret';
const REFRESH_TOKEN_SECRET = 'your_refresh_token_secret';

export async function authMiddleware(socket, next) {
    const authHeader = socket.handshake.headers.authorization;

    if (!authHeader) {
        return next(new Error('Нет заголовка авторизации'));
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return next(new Error('Нет токена'));
    }

    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        const redisClient = await getRedisClient();
        const isValid = await redisClient.get(`access_token:${token}`);

        if (!isValid) {
            return next(new Error('Неверный токен или токен истек'));
        }

        socket.user = decoded;
        next();
    } catch (err) {
        return next(new Error('Неверный токен'));
    }
}

export async function generateAccessToken(user) {
    const token = jwt.sign(user, ACCESS_TOKEN_SECRET, { expiresIn: '15m' }); // 15 минут
    const redisClient = await getRedisClient();
    await redisClient.set(`access_token:${token}`, 'valid', { EX: 900 }); // 15 минут
    return token;
}

export async function generateRefreshToken(user) {
    const token = jwt.sign(user, REFRESH_TOKEN_SECRET, { expiresIn: '7d' }); // 7 дней
    const redisClient = await getRedisClient();
    await redisClient.set(`refresh_token:${token}`, 'valid', { EX: 604800 }); // 7 дней
    return token;
}

export async function invalidateAccessToken(token) {
    const redisClient = await getRedisClient();
    await redisClient.del(`access_token:${token}`);
}

export async function invalidateRefreshToken(token) {
    const redisClient = await getRedisClient();
    await redisClient.del(`refresh_token:${token}`);
}

export async function refreshAccessToken(refreshToken) {
    try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        const redisClient = await getRedisClient();
        const isValid = await redisClient.get(`refresh_token:${refreshToken}`);

        if (!isValid) {
            return null; // Refresh token недействителен
        }

        const accessToken = await generateAccessToken(decoded);
        return accessToken;
    } catch (err) {
        return null; // Refresh token недействителен
    }
}

export async function registerUser(username, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Сохраните username и hashedPassword в вашей базе данных (или Redis)
    // ...
    return { username, password: hashedPassword };
}

export async function loginUser(username, password) {
    // Получите пользователя из вашей базы данных (или Redis) по username
    // ...
    const user = { username, password : "$2b$10$L0Q7j3s1B2.Hlq5y97k7a.1103s72X7zX9Y9c7Q3V0c7.tFpUa" }; // временно

    if (!user) {
        return null;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        return null;
    }

    return user;
}