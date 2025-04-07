const {authMiddleware} = require("../middleware");
module.exports = function(io) {
     io.on("connection", async (socket) => {
         console.info('Connected to namespace2 44444444444444');
         socket.on('message', (msg) => {
             console.info('Message on namespace211111111111111:', msg);
             socket.emit('response', 'Message received in namespace2');
         });
         socket.on('disconnect', () => {
             console.log('A user disconnected from namespace1');
         });
     });
};