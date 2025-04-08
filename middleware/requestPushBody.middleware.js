const logger = require("../utils/logger");
const ValidatePushRequest = require("../validators/requests/ValidatePushRequest");


async function requestPushBodyMiddleware(req, res, next) {

    const {error, value} = ValidatePushRequest(req.body);

    if (error) {
        logger.error("Ошибка валидации:");
        return res.status(400).json({
            success: false,
            message: 'Ошибка валидации',
            errors: error.details.map(err => err.message)
        });
    }

    next(); // Proceed to the next middleware or route handler
}
module.exports = requestPushBodyMiddleware;