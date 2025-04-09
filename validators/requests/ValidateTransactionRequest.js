const Joi = require("joi");


// optional(): Используйте, если поле может отсутствовать.
// allow(null): Используйте, если поле может быть явно установлено в null.
// allow(null).optional(): Используйте, если поле может отсутствовать или быть null.
// default(): Используйте, если поле должно иметь значение по умолчанию при

const schema  = Joi.object({
    event: Joi.string().min(3).required(),
    channels: Joi.alternatives().try(
        Joi.string().pattern(/^[-a-zA-Z0-9_=@,.;]+$/).message('Invalid channel name'),
        Joi.array().items(Joi.string().pattern(/^[-a-zA-Z0-9_=@,.;]+$/).message('Invalid channel name'))
    ),
    message: Joi.object({
        id: Joi.number().integer().required(),
        subscription_id: Joi.allow(null).optional(),
        description: Joi.allow(null).optional(),
        account_id: Joi.number().integer(),
        pay_id: Joi.optional(),
        amount: Joi.number(),
        status: Joi.string(),
        status_original: Joi.string(),
        pay_account: Joi.string(),
        pay_system: Joi.string(),
        type: Joi.string(),
        created_at: Joi.number().integer().optional(),
        updated_at: Joi.number().integer().optional(),
        provider_id_s: Joi.string().allow(null).optional(),
        created_by: Joi.number().integer().optional(),
        updated_by: Joi.number().integer().optional(),
    }),
    namespace: Joi.string().optional(),
});

const ValidateTransactionRequest = (data) => {
    return schema.validate(data, { abortEarly: false });
};

module.exports = ValidateTransactionRequest;