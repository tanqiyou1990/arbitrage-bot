require("dotenv").config();

module.exports = {
  // 交易模式：simulation(模拟交易) 或 live(实盘交易)
  mode: process.env.TRADING_MODE || "simulation",

  // 交易参数（模拟和实盘共用）
  trading: {
    maxPositionAmount: parseFloat(process.env.MAX_POSITION_AMOUNT) || 1000, // 最大开仓金额限制（USDT）
    leverage: parseInt(process.env.LEVERAGE) || 100, // 合约杠杆倍数
    minOrderSize: parseFloat(process.env.MIN_ORDER_SIZE) || 1, // 最小下单数量
    orderSizeRatio: parseFloat(process.env.ORDER_SIZE_RATIO) || 0.7, // 订单数量比例
    stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE) || 0.9, // 止损百分比
  },

  // 价差阈值设置
  threshold: {
    open: parseFloat(process.env.OPEN_THRESHOLD) || 0.0002,
    close: parseFloat(process.env.CLOSE_THRESHOLD) || 0.0002,
  },

  // WebSocket配置
  reconnectDelay: process.env.RECONNECT_DELAY || 2000,
  pingInterval: process.env.PING_INTERVAL || 18000,

  // 交易对配置
  symbol: process.env.TRADING_SYMBOL || "ETHUSDT",

  // 交易所手续费率配置
  fees: {
    binance: parseFloat(process.env.BINANCE_FEE) || 0.0001,
    bitget: parseFloat(process.env.BITGET_FEE) || 0.0001,
  },

  // 交易所API配置
  exchanges: {
    binance: {
      apiKey: process.env.BINANCE_API_KEY,
      secretKey: process.env.BINANCE_SECRET_KEY,
    },
    bitget: {
      apiKey: process.env.BITGET_API_KEY,
      secretKey: process.env.BITGET_SECRET_KEY,
      passphrase: process.env.BITGET_PASSPHRASE,
    },
  },
};
