const jwt = require("jsonwebtoken");

const token = jwt.sign({ username: "test_user" }, "your_secret_key", { expiresIn: "1h" });
console.log("Ваш токен:", token);