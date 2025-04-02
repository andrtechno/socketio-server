const Joi = require("joi");


const BillingBodySchema  = Joi.object({
    channel: Joi.string().min(3).max(30).required(),
    namespace: Joi.string().min(3).required(),
    message: Joi.object({
        message: Joi.string().min(3).required(),
    })
});
const validateBillingBody = (data) => {
    return BillingBodySchema.validate(data, { abortEarly: false });
};

module.exports = validateBillingBody;