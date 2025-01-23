module.exports = {
  mode: process.env.TRADING_MODE || "simulation",
  maxPositionSize: process.env.MAX_POSITION_SIZE || 0.1,
  orderSizeRatio: process.env.ORDER_SIZE_RATIO || 0.7,
  threshold: process.env.PRICE_THRESHOLD || 0.0006,
  reconnectDelay: process.env.RECONNECT_DELAY || 2000,
  pingInterval: process.env.PING_INTERVAL || 18000,
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
};
