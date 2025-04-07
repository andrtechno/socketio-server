const logger = require("./logger");

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : [];

const corsOptions = {
    origin: function (origin, callback) {

        // Если в dev-режиме, разрешаем все источники
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        // if (!origin) {
        //     logger.error('CORS blocked: No Origin header present'); // Логируем, если Origin отсутствует
        //     return callback(new Error('CORS requires Origin header'));
        // }

        // Разрешаем запросы без Origin (например, cURL или Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Если Origin в списке разрешённых, разрешаем
        // if (allowedOrigins.includes(origin)) {
        //     return callback(null, true);
        // }

        // Логируем заблокированные запросы
        logger.error(`CORS Blocked: ${origin}`);
        return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
};

const socketCorsOptions = {
    origin: process.env.NODE_ENV === 'development' ? '*' : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
};

module.exports = {
    corsOptions,
    socketCorsOptions,
};
