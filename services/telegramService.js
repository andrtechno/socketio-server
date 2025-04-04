const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

const sendTelegramMessage = async (chatId, message) => {
    try {
        await bot.sendMessage(chatId, message);
    } catch (err) {
        console.error('Error sending message to Telegram:', err);
    }
};

module.exports = { sendTelegramMessage };