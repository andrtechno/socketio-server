
const express = require('express')
const fs =  require('fs');
const path =  require('path');
//const server = require('http').createServer();
const http =  require("http");
const {Server} =  require('socket.io');
const {fileURLToPath} =  require('url');

const app = express();
const server = http.createServer({
    //key: fs.readFileSync("key.pem"),  // Для теста: самоподписанный ключ
    //cert: fs.readFileSync("cert.pem") // Для теста: самоподписанный сертификат
}, app);

const io = new Server();

app.use(express.json());

app.get("/", (req, res) => {
     res.status(200).send("👌");
});






const port = 3000;
const dir = __dirname;
const host = '0.0.0.0';
const factory = options => {
    options = options || {};
    // is version 0x?
    if (typeof io.listen === 'function' && options.path) {
        options.resource = options.path;
        delete options.path;
    }
    return typeof io === 'function' ? io(server, options) :
        io.listen(server, options);
}
const serve = (prefix, io) => {
    fs
        .readdirSync(dir)
        .filter(file => file.startsWith(prefix))
        .map(file => {
            const Svr = require(path.join(dir, file));
            const s = new Svr(io);
            s.name = file.substr(prefix.length, file.length - prefix.length - 3);
            return s;
        })
        .sort((a, b) => a.ns.localeCompare(b.ns))
        .forEach(s => {
            if (s.nsp && s.handle()) {
                console.log('Serving %s on %s', s.name, '/' + s.ns);
            }
        });
}

console.log('Please wait, running servers...');
serve('serve-', factory());
// socket io 0x doesn't like multiple instances
serve('serve2-', factory({path: '/my/my.io'}));


// server.on('error', (e) => {
//     if (e.code === 'EADDRINUSE') {
//         console.error('Address in use, retrying...');
//         setTimeout(() => {
//             server.close();
//             server.listen(port, host);
//         }, 1000);
//     }
// });
server.listen(port, host, () => {
    console.log('Server listening at %d...', port);
});