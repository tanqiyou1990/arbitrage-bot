module.exports = {
  fees: {
    binance: process.env.BINANCE_FEE || 0.0005,
    bitget: process.env.BITGET_FEE || 0.0005,
  },
  threshold: process.env.PRICE_THRESHOLD || 0.0006,
  reconnectDelay: process.env.RECONNECT_DELAY || 2000,
  pingInterval: process.env.PING_INTERVAL || 18000,
  maxPositionSize: process.env.MAX_POSITION_SIZE || 50, // 最大开仓数量，默认50个ETH
  orderSizeRatio: process.env.ORDER_SIZE_RATIO || 0.7, // 默认使用70%的可用数量
  mode: process.env.TRADING_MODE || "simulation", // 'simulation' 或 'live'
  // 添加交易所API配置
  exchanges: {
    binance: {
      apiKey: process.env.BINANCE_API_KEY,
      secretKey: process.env.BINANCE_SECRET_KEY,
      // 其他币安配置
    },
    bitget: {
      apiKey: process.env.BITGET_API_KEY,
      secretKey: process.env.BITGET_SECRET_KEY,
      // 其他Bitget配置
    },
  },
};
