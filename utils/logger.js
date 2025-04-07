const winston = require("winston");
const util = require('util');

const logger = winston.createLogger({
    level: 'info',
    defaultMeta: { service: 'socket' },
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }), // Enable stack trace in error logs
        winston.format.printf(({ timestamp, level, message, stack }) => {
            // let formattedArgs = '';
            // if (meta) {
            //     formattedArgs = meta.map((arg) => {
            //         if (typeof arg === 'object') {
            //             return util.inspect(arg); // Форматируем объекты
            //         }
            //         return arg; // Оставляем строки как есть
            //     }).join(' ');
            // }
            return `${timestamp} - ${level}: ${message} ${stack || ''}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
        new winston.transports.File({ filename: 'logs/info.log' }),
       // new winston.transports.Console(),
    ],
});


// if (process.env.NODE_ENV !== 'production') {
//     logger.add(new winston.transports.Console({
//         format: winston.format.simple(),
//     }));
// }


module.exports = logger;