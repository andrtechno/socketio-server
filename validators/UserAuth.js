import { body,validationResult } from "express-validator";

const existingUsers = ["test@example.com", "admin@example.com"];
export const validateUserAuth = [
    body("username")
        .trim()
        .isEmail()
        .withMessage("Некорректный email")
        .custom(async (email) => {
            if (existingUsers.includes(email)) {
                throw new Error("Email уже используется");
            }
            return true;
        }),


    body("password")
        .isLength({ min: 6 }).withMessage("Пароль должен быть минимум 6 символов")
        .matches(/\d/).withMessage("Пароль должен содержать хотя бы одну цифру"),
];
