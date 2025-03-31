const { initRedis } = require('./redis'); // Путь к файлу с функцией initRedis
const http = require('http');
const socketIo = require('socket.io');
const ioredisMock = require('ioredis-mock'); // Мокаем ioredis для тестов

jest.mock('socket.io', () => {
    return jest.fn().mockImplementation(() => ({
        adapter: jest.fn()
    }));
});

jest.mock('@socket.io/redis-adapter', () => jest.fn());

describe('Socket.io с Redis Adapter', () => {
    let server, io;

    beforeAll(() => {
        // Создаем сервер HTTP
        server = http.createServer();
        io = socketIo(server);
    });

    it('должен подключить Redis Adapter в Socket.io', async () => {
        const mockClients = {
            pubClient: new ioredisMock(),
            subClient: new ioredisMock()
        };

        // Мокаем подключение к Redis
        await initRedis(io);

        // Проверка, что Redis Adapter был подключен к Socket.io
        expect(require('@socket.io/redis-adapter')).toHaveBeenCalledWith(
            mockClients.pubClient,
            mockClients.subClient
        );

        // Проверка, что io.adapter был вызван
        expect(io.adapter).toHaveBeenCalled();
    });

    afterAll(() => {
        server.close();
    });
});
