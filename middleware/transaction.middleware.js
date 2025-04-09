const jwt = require("jsonwebtoken");
const validateBillingBody = require("../validators/requests/ValidateBillingBody");
const logger = require("../utils/logger");
const ValidateTransactionRequest = require("../validators/requests/ValidateTransactionRequest");

/**
 * В РАЗРАБОТКЕ!!!!!!!!!
 * @param req
 * @param res
 * @param next
 * @returns {Promise<*>}
 */
async function bearerTokenMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // No token


    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.decoded = user; // Add user data to the request object
    });


    const {channel, message} = req.body;


    //Разрешенные каналы
    const channelAllow = ["billing", "transaction", "main"];

    if (channelAllow.indexOf(channel) === -1) {
        return res.status(400).json({
            success: false,
            message: 'не верный канал.',
        });
    }

    next(); // Proceed to the next middleware or route handler
}
module.exports = bearerTokenMiddleware;