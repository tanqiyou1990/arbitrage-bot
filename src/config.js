module.exports = {
  mode: process.env.TRADING_MODE || "simulation",
  maxPositionAmount: process.env.MAX_POSITION_AMOUNT || 1000, // 10000U账户情况下最大保证金额度
  leverage: process.env.LEVERAGE || 100,
  orderSizeRatio: process.env.ORDER_SIZE_RATIO || 0.7,
  // 将单一阈值拆分为开仓和平仓阈值
  threshold: {
    open: process.env.OPEN_THRESHOLD || 0.0006, // 开仓价差要求
    close: process.env.CLOSE_THRESHOLD || 0.0002, // 平仓价差要求，通常小于开仓阈值
  },
  reconnectDelay: process.env.RECONNECT_DELAY || 2000,
  pingInterval: process.env.PING_INTERVAL || 18000,
  symbol: process.env.TRADING_SYMBOL || "ETHUSDT",
  fees: {
    binance: process.env.BINANCE_FEE || 0.0005,
    bitget: process.env.BITGET_FEE || 0.0005,
  },
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
  stopLossPercentage: process.env.STOP_LOSS_PERCENTAGE || 0.9, // 距离爆仓线90%时平仓
};
