const MainServer = require('./serve');
const express = require("express");
const http = require("http");
const {Server} = require("socket.io");
const {instrument} = require("@socket.io/admin-ui");
const path = require("path");

class AdminServer extends MainServer {

    /** @type {Express} */
    app = null;

    constructor(io) {
        super(io);

        const app = express();


// HTTP Admin panel
        app.use('/admin', express.static(path.join(__dirname, 'node_modules', '@socket.io/admin-ui', 'ui', 'dist')));

        instrument(io, {
            auth: false,
            mode:"development",
            namespaceName: "/admin"
        });

        this.initialize();
        this.nsp = this.io.of(this.namespace ? this.namespace : '');

    }

    initialize() {
        this.namespace = 'admin';

    }

    handle() {

        return true;
    }
}

module.exports = AdminServer;