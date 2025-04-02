const mysql = require('mysql2/promise');
const logger = require("./logger.js");


const pool = mysql.createPool({
    host: process.env.DB_MNGR_HOST,
    user: process.env.DB_MNGR_USERNAME,
    password: process.env.DB_MNGR_PASSWORD,
    database: process.env.DB_MNGR_DATABASE,
    connectionLimit: 3, // Максимальное количество соединений в пуле
});


async function executeQueryWithPool(sql, values = []) {
    // try {
    //     const connection = await pool.getConnection(); // Получение соединения из пула
    //     const [rows, fields] = await connection.execute(sql, values);
    //     connection.release(); // Возвращение соединения в пул
    //     return rows;
    // } catch (err) {
    //     console.error('Ошибка выполнения запроса:', err);
    //     throw err;
    // }

    try {
        const [rows] = await pool.query("SELECT * FROM user LIMIT 1");
        console.log("Пользователи:", rows);
    } catch (error) {
        console.error("Ошибка запроса:", error);
    }
}

async function poolExample() {
    try {
        const users = await executeQueryWithPool('SELECT * FROM user LINIT 1');
        console.log("пользователи из пула: ", users);
    } catch(err) {
        console.log("Ошибка из пула: ", err);
    } finally {
        await pool.end();
    }
}


async function connectToDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_MNGR_HOST,
            user: process.env.DB_MNGR_USERNAME,
            password: process.env.DB_MNGR_PASSWORD,
            database: process.env.DB_MNGR_DATABASE,
        });
        logger.info('Подключение к базе данных успешно установлено!');
        return connection;
    } catch (err) {
        logger.error('Ошибка подключения к базе данных:', err);
        throw err; // Пробросить ошибку для обработки выше
    }
}


async function executeQuery(connection, sql, values = []) {
    try {
        const [rows, fields] = await connection.execute(sql, values);
        return rows;
    } catch (err) {
        logger.error('Ошибка выполнения запроса:', err);
        throw err;
    }
}

async function exampleUsage() {
    const connection = await connectToDatabase();

    try {
        // Пример запроса SELECT
        const users = await executeQuery(connection, 'SELECT * FROM user LIMIT 1');
        //const users = await executeQuery(connection, 'SELECT * FROM user WHERE id = ?', [1]);
        logger.info('Пользователи:', users);

        // Пример запроса INSERT
        // const result = await executeQuery(connection, 'INSERT INTO users (name, email) VALUES (?, ?)', ['John Doe', 'john.doe@example.com']);
        // console.log('Результат INSERT:', result);
        //
        // // Пример запроса UPDATE
        // const updateResult = await executeQuery(connection, 'UPDATE users SET email = ? WHERE name = ?', ['updated@example.com', 'John Doe']);
        // console.log("Результат UPDATE: ", updateResult);
        //
        // // Пример запроса DELETE
        // const deleteResult = await executeQuery(connection, "DELETE FROM users WHERE name = ?", ['John Doe']);
        // console.log("Результат DELETE: ", deleteResult);

    } catch (err) {
        // Обработка ошибок
        logger.error('Error');
    } finally {
        if (connection) {
            await connection.end(); // Закрытие соединения
            logger.info('Соединение с базой данных закрыто.');
        }
    }
}



async function getUserByToken(username, password) {
    const connection = await connectToDatabase();

    try {
        // Пример запроса SELECT
        //const users = await executeQuery(connection, 'SELECT * FROM user LIMIT 1');
        const users = await executeQuery(connection, 'SELECT * FROM user WHERE username = ? AND password=?', [username,password]);
        logger.info('Пользователи:', users);

        // Пример запроса INSERT
        // const result = await executeQuery(connection, 'INSERT INTO users (name, email) VALUES (?, ?)', ['John Doe', 'john.doe@example.com']);
        // console.log('Результат INSERT:', result);
        //
        // // Пример запроса UPDATE
        // const updateResult = await executeQuery(connection, 'UPDATE users SET email = ? WHERE name = ?', ['updated@example.com', 'John Doe']);
        // console.log("Результат UPDATE: ", updateResult);
        //
        // // Пример запроса DELETE
        // const deleteResult = await executeQuery(connection, "DELETE FROM users WHERE name = ?", ['John Doe']);
        // console.log("Результат DELETE: ", deleteResult);

    } catch (err) {
        // Обработка ошибок
        logger.error('Error');
    } finally {
        if (connection) {
            await connection.end(); // Закрытие соединения
            logger.info('Соединение с базой данных закрыто.');
        }
    }
}

module.exports = {getUserByToken,exampleUsage,executeQuery,connectToDatabase,poolExample};