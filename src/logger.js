const winston = require("winston");
const { format } = winston;

// 创建自定义格式
const customFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// 创建 logger 实例
const logger = winston.createLogger({
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.colorize(),
    customFormat
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console(),
    // 文件输出
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

module.exports = logger;
