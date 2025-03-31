export function setupChatNamespace(io) {
    const chatNamespace = io.of('/chat');

    chatNamespace.on('connection', (socket) => {
        console.log('Клиент подключился к /chat:', socket.id);

        socket.on('joinRoom', (room) => {
            socket.join(room);
            console.log(`Клиент ${socket.id} присоединился к комнате ${room}`);
        });

        socket.on('sendMessage', ({ room, message }) => {
            chatNamespace.to(room).emit('newMessage', { message, sender: socket.id });
        });

        socket.on('disconnect', () => {
            console.log('Клиент отключился от /chat:', socket.id);
        });
    });
}