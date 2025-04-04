const Joi = require("joi");

const schema = Joi.object({
    id: Joi.number().integer().required(),
    email: Joi.string().email().required(),
    first_name: Joi.string().min(1).required(),
    last_name: Joi.string().min(1).required(),
});;

const jwtPayloadValidate = (data) => {
    return schema.validate(data, { abortEarly: false });
};

module.exports = jwtPayloadValidate;