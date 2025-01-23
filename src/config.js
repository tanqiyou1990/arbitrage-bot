module.exports = {
  fees: {
    binance: process.env.BINANCE_FEE || 0.0005,
    bitget: process.env.BITGET_FEE || 0.0005,
  },
  threshold: process.env.PRICE_THRESHOLD || 0.0006,
  reconnectDelay: process.env.RECONNECT_DELAY || 2000,
  pingInterval: process.env.PING_INTERVAL || 18000,
  maxPositionSize: process.env.MAX_POSITION_SIZE || 50, // 最大开仓数量，默认50个ETH
};
