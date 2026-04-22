import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3030,
  jwtSecret: process.env.JWT_SECRET || 'valo-super-secret-key-2024',
  dbUrl: process.env.DATABASE_URL || 'postgresql://postgres:valo123@localhost:5432/valo',
  hardwarePort: process.env.HARDWARE_PORT || 8080,
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  ocr: {
    lang: 'eng+tur',
  }
};
