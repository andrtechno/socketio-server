const Joi = require("joi");

const schema = Joi.object({
    event: Joi.string().min(3).required(),
    channels: Joi.alternatives().try(
        Joi.string().pattern(/^[-a-zA-Z0-9_=@,.;]+$/).message('Invalid channel name'),
        Joi.array().items(Joi.string().pattern(/^[-a-zA-Z0-9_=@,.;]+$/).message('Invalid channel name'))
    ),
    message: Joi.object().required(),
    namespace: Joi.string().optional(),
});

const ValidatePushRequest = (data) => {
    return schema.validate(data, {abortEarly: false, debug: true});
};

module.exports = ValidatePushRequest;