const {createLogger, format, transports} = require("winston");
const { combine, timestamp, printf, colorize, errors } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const logFormat = printf(({ level, message, timestamp, stack, meta }) => {
    return `[${timestamp}] ${level}: ${message} ${stack ? `\nStack trace: ${stack} ` : ''}${meta ? JSON.stringify(meta) : ''}`;
});

const transportConsole = new transports.Console({
    format: combine(
        colorize(),
        logFormat
    )
});

const transportErrorFile = new DailyRotateFile({
    filename: 'logs/%DATE%-error.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '1m',
    maxFiles: '14d',
    zippedArchive: true,
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    )
});

const transportCombinedFile = new DailyRotateFile({
    filename: 'logs/%DATE%-combined.log',
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    maxSize: '1m',
    maxFiles: '14d',
    zippedArchive: true,
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    )
});

const logger = createLogger({
    level: 'info',
    exitOnError: false,
    defaultMeta: { service: 'socket' },
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }) // ловит error.stack
    ),
    transports: [
        transportConsole,
        transportErrorFile,
        transportCombinedFile,
    ],
});


module.exports = logger;