
const knexService = require('knex')({
    client: 'mysql2',
    connection: async () => {
        console.log('Knex connection');
        return {
            host: process.env.DB_MNGR_HOST,
            port: process.env.DB_MNGR_PORT,
            user: process.env.DB_MNGR_USERNAME,
            password: process.env.DB_MNGR_PASSWORD,
            database: process.env.DB_MNGR_DATABASE,
        };

    },
    userParams: {
        userParam1: '451',
    },
});

module.exports = knexService