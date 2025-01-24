require("dotenv").config();

module.exports = {
  // 交易模式：simulation(模拟交易) 或 live(实盘交易)
  mode: process.env.TRADING_MODE || "simulation",

  // 最大开仓金额限制（USDT）
  maxPositionAmount: parseFloat(process.env.MAX_POSITION_AMOUNT) || 1000,

  // 合约杠杆倍数
  leverage: parseInt(process.env.LEVERAGE) || 100,

  // 订单数量比例
  orderSizeRatio: parseFloat(process.env.ORDER_SIZE_RATIO) || 0.7,

  // 价差阈值设置
  threshold: {
    open: parseFloat(process.env.OPEN_THRESHOLD) || 0.0002,
    close: parseFloat(process.env.CLOSE_THRESHOLD) || 0.0002,
  },

  // WebSocket断开后重连延迟时间（毫秒）
  reconnectDelay: process.env.RECONNECT_DELAY || 2000,

  // WebSocket心跳检测间隔（毫秒）
  pingInterval: process.env.PING_INTERVAL || 18000,

  // 交易对名称，如ETHUSDT、BTCUSDT等
  symbol: process.env.TRADING_SYMBOL || "ETHUSDT",

  // 交易所手续费率配置
  fees: {
    binance: process.env.BINANCE_FEE || 0.0001, // 币安单向手续费率（如：0.0001代表0.01%）
    bitget: process.env.BITGET_FEE || 0.0001, // Bitget单向手续费率
  },

  // 交易所API配置
  exchanges: {
    binance: {
      apiKey: process.env.BINANCE_API_KEY, // 币安API密钥
      secretKey: process.env.BINANCE_SECRET_KEY, // 币安密钥
    },
    bitget: {
      apiKey: process.env.BITGET_API_KEY, // Bitget API密钥
      secretKey: process.env.BITGET_SECRET_KEY, // Bitget密钥
      passphrase: process.env.BITGET_PASSPHRASE, // Bitget API密码短语
    },
  },

  // 止损设置：当价格达到距离爆仓价格的指定百分比时触发平仓（0-1之间）
  // 例如：0.9表示当价格达到距离爆仓价格90%的位置时平仓
  stopLossPercentage: 0.9,
  simulation: {
    initialBalance: 10000, // 模拟账户初始余额
    minOrderSize: 1, // 最小下单数量
    maxLeverage: 100, // 最大杠杆倍数
  },
};
