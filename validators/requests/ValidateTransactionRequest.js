const Joi = require("joi");


// optional(): Используйте, если поле может отсутствовать.
// allow(null): Используйте, если поле может быть явно установлено в null.
// allow(null).optional(): Используйте, если поле может отсутствовать или быть null.
// default(): Используйте, если поле должно иметь значение по умолчанию при

const transactionSchema  = Joi.object({
    namespace: Joi.string().min(3).required(),
    eventName: Joi.string().required(),
    channel: Joi.string().required(),
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
    })
});

const ValidateTransactionRequest = (data) => {
    return transactionSchema.validate(data, { abortEarly: false });
};

module.exports = ValidateTransactionRequest;