const Redis = require('ioredis');
const logger = require("../utils/logger");


class RedisService {
    constructor() {
        this.client = null;
        this.pubClient = null;
        this.subClient = null;
        this.config = {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB,
        }
    }

    async init() {
        if (this.client) return; // уже инициализирован

        this.client = new Redis(this.config);
        this.pubClient = new Redis(this.config);
        this.subClient = this.pubClient.duplicate();

        // Ждем, пока все соединения будут готовы
        await Promise.all([
            new Promise((resolve, reject) => this.client.once('ready', resolve).once('error', reject)),
            new Promise((resolve, reject) => this.pubClient.once('ready', resolve).once('error', reject)),
            new Promise((resolve, reject) => this.subClient.once('ready', resolve).once('error', reject)),
        ]);

        logger.info('✅ Redis-соединения установлены');
    }

    getClient() {
        if (!this.client) throw new Error('Redis не инициализирован');
        return this.client;
    }

    getPubClient() {
        if (!this.pubClient) throw new Error('Redis не инициализирован');
        return this.pubClient;
    }

    getSubClient() {
        if (!this.subClient) throw new Error('Redis не инициализирован');
        return this.subClient;
    }

    // String: Set value
    async set(key, value, ttlSeconds = null) {
        if (ttlSeconds) {
            await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } else {
            await this.client.set(key, JSON.stringify(value));
        }
    }

    async hSet(key, field, value) {
        const client = this.getClient();
        try {
            // hset используется для записи значения в хеш
            await client.hset(key, field, value);
            console.log(`✅ Данные установлены в хеш: ${key}, поле: ${field}, значение: ${value}`);
        } catch (error) {
            console.error('❌ Ошибка при установке данных в хеш Redis:', error);
            throw error;
        }
    }

    async hSetAll(key, fieldsValues) {
        const client = this.getClient();
        try {
            // fieldsValues — это объект с полями и значениями, которые нужно записать
            const flatValues = [];

            // Преобразуем объект в массив вида [field1, value1, field2, value2, ...]
            for (const [field, value] of Object.entries(fieldsValues)) {
                flatValues.push(field, value);
            }

            // Используем hset для записи нескольких полей за раз
            await client.hset(key, ...flatValues);
            console.log(`✅ Данные установлены в хеш: ${key}, поля: ${Object.keys(fieldsValues).join(', ')}`);
        } catch (error) {
            console.error('❌ Ошибка при установке данных в хеш Redis:', error);
            throw error; // Бросаем ошибку дальше
        }
    }

    // String: Get value
    async get(key) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
    }

    // Delete key
    async del(key) {
        return await this.client.del(key);
    }

    // Check if key exists
    async exists(key) {
        return await this.client.exists(key);
    }

    // Work with Sets
    async sadd(key, member) {
        return await this.client.sadd(key, member);
    }

    async smembers(key) {
        return await this.client.smembers(key);
    }

    async srem(key, member) {
        return await this.client.srem(key, member);
    }

    async hGetAll(key) {
        const client = this.getClient();
        try {
            return await client.hgetall(key);
        } catch (error) {
            console.error('❌ Ошибка при получении данных из хеша Redis:', error);
            throw error; // Бросаем ошибку дальше для обработки
        }
    }


    async scanKeys(pattern) {
        let cursor = '0';  // Начинаем с курсора 0
        let keys = [];
        const client = this.getClient();
        // Цикл сканирования Redis
        do {
            // Выполняем команду SCAN с курсором и паттерном
            const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);

            cursor = result[0]; // Новый курсор для следующего шага
            const currentKeys = result[1]; // Текущие ключи, соответствующие паттерну

            keys = keys.concat(currentKeys); // Добавляем текущие ключи к общему списку

        } while (cursor !== '0');  // Повторяем, пока не получим курсор, равный 0 (что означает завершение)

        return keys;
    }

    /**
     * deleteKeysByPattern('key:*')
     * @param pattern
     * @returns {Promise<*[]>}
     */
    async deleteKeysByPattern(pattern) {
        const client = this.getClient();
        let cursor = '0';  // Изначальный курсор
        let deletedKeys = [];

        do {
            // Выполняем scan
            const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = result[0];  // Новый курсор
            const keys = result[1];  // Ключи, соответствующие паттерну

            if (keys.length > 0) {
                logger.info(`Найдено ключей: ${keys.length}`);
                await client.del(keys);  // Удаляем ключи
                deletedKeys.push(...keys);  // Добавляем удаленные ключи в список
                logger.info(`Удалены ключи: ${keys.join(', ')}`);
            } else {
                logger.info('Ключи не найдены для удаления.');
            }
        } while (cursor !== '0');  // Повторяем, пока курсор не станет равным 0

        return deletedKeys;  // Возвращаем список удаленных ключей
    }

    // Close connection
    async quit() {
        if (this.client) await this.client.quit();
        if (this.pubClient) await this.pubClient.quit();
        if (this.subClient) await this.subClient.quit();
        logger.info('Соединение с Redis закрыто.');

    }

}

// Singleton export
module.exports = new RedisService();
