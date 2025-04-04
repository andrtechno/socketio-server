const mysql = require('mysql2/promise');
const logger = require("../utils/logger");
const Redis = require("ioredis");


class MySQLService {
    constructor() {
        this.pool = null;
        this.config = {
            host: process.env.DB_MNGR_HOST,
            user: process.env.DB_MNGR_USERNAME,
            password: process.env.DB_MNGR_PASSWORD,
            database: process.env.DB_MNGR_DATABASE,
            waitForConnections: true, // Ожидание свободных соединений
            connectionLimit: 10,      // Максимальное количество подключений
            queueLimit: 0,             // Без ограничений по очереди
            charset: 'utf8mb4_general_ci'  // Добавить кодировку
        }
    }

    // Инициализация соединения с MySQL
    async init() {
        if (!this.pool) {

            this.pool = mysql.createPool(this.config);
            logger.info('Соединение с MySQL успешно установлено.');

        }
    }


    // Функция для выполнения SQL-запроса pool
    async executeQuery(query, params = []) {
        try {
            await this.init(); // Убедитесь, что подключены через пул

            // Выполняем запрос и возвращаем результат
            const [rows, fields] = await this.pool.query(query, params); // Выполнение запроса с параметрами
            return rows; // Возвращаем строки результата
        } catch (error) {
            logger.error('Ошибка при выполнении SQL запроса:', error);
            throw error; // Пробрасываем ошибку дальше
        }
    }


    // Закрытие подключения
    async close() {
        try {
            if (this.pool) {
                await this.pool.end(); // Закрыть пул
                logger.info('Соединение с MySQL закрыто.');
            } else {
                logger.warn('Пул подключений уже закрыт.');
            }
        } catch (error) {
            logger.error('Ошибка при закрытии соединения с MySQL:', error);
        }
    }
}


module.exports = new MySQLService();