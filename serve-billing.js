const MainServer = require('./serve');
const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

class BillingServer extends MainServer {

    /** @type {Express} */
    app = null;

    constructor(io) {
        super(io);

        this.app = express();
        let httpSever = http.createServer({
            //key: fs.readFileSync("key.pem"),  // Для теста: самоподписанный ключ
            //cert: fs.readFileSync("cert.pem") // Для теста: самоподписанный сертификат
        }, this.app);

        // httpSever.setTimeout(5000, () => {
        //     console.log('Server timed out');
        // });

        // this.app.post("/billing/send_message", (req, res) => {
        //     const {channel, message} = req.body;
        //
        //     // Если канал и сообщение указаны, отправляем сообщение в канал
        //     if (channel && message) {
        //         this.io.of("/billing").to(channel).emit("event", message);
        //         // io.of("/billing").to(channel).emit("ns_message", message);
        //         this.log(`Sent to channel ${channel}:`, message);
        //         //res.status(200).send("Message sent");
        //         res.status(200).json({success: true});
        //     } else {
        //         //res.status(400).send("Channel and message are required");
        //         res.status(400).json({success: false});
        //     }
        // });

        this.io = new Server(httpSever, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            maxHttpBufferSize: 1e8 // 100 MB
        });

        this.initialize();
        this.nsp = this.io.of(this.namespace ? this.namespace : '');

    }

    initialize() {
        this.namespace = 'billing';

    }

    handle() {


        if (typeof this.nsp.use === 'function') {
            this.nsp.use((socket, next) => {
                // if (socket.handshake && socket.handshake.auth) {
                //     const user = socket.handshake.auth.user;
                //     const token = socket.handshake.auth.token;
                //     if (user && token) {
                //         this.log('auth token', token);
                //         // do some security check with token
                //         // for example:
                //         if (user === 'random@example.com' && token === 'my-secret-token') {
                //             this.log('successfully authenticated');
                //             next();
                //         } else {
                //             next(new Error('invalid credentials'));
                //         }
                //     } else {
                //         next(new Error('missing auth from the handshake'));
                //     }
                // } else {
                //     next();
                // }
                next();
            });
        }



        this.nsp.on('connection', socket => {
            this.log('connected: %s', socket.id);
            socket
                .on('disconnect', () => {
                    this.log('disconnected: %s', socket.id);
                })
                .on('echo', message => {
                    socket.emit('echo', message);
                })
                .on("subscribe", (data) => {
                    this.log(`📩 Клиент подписался на: ${JSON.stringify(data)}`);

                    if (data.channel) {
                        socket.join(data.channel);
                        this.log(`✅ Подписан на канал: ${data.channel}`);
                    } else {
                        this.log("❌ Ошибка: Не передан канал в subscribe");
                    }
                })
                .on('test', (arg1, arg2, arg3) => {
                    this.log('Test arguments', arg1, arg2, arg3);
                    socket.emit('test', 1, 2, 'Okay');
                });
            setTimeout(() => socket.emit('hello'), 500);
        });


        return true;
    }
}

module.exports = BillingServer;