import express from "express";
import { body, validationResult } from "express-validator";

const existingUsers = ["test@example.com", "admin@example.com"];
export const validateUser = [
    body("message")
        .trim()
        .withMessage("Некорректный email"),

    body("channel")
        .isLength({ min: 6 }).withMessage("Пароль должен быть минимум 6 символов")
        .matches(/\d/).withMessage("Пароль должен содержать хотя бы одну цифру"),
];