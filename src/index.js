const WebSocket = require("ws");
const config = require("./config");
const logger = require("./logger");
const { LiveTrader, SimulatedTrader } = require("./exchanges");

// 添加全局错误处理
process.on("uncaughtException", (error) => {
  logger.error("未捕获的异常:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("未处理的 Promise 拒绝:", reason);
});

// 修改 WebSocketClient 类的错误处理
class WebSocketClient {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.reconnectDelay = config.reconnectDelay;
    this.heartbeatInterval = null;
    this.ws = null;
    this.isConnected = false; // 添加初始化
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.on("open", () => {
        this.isConnected = true;
        logger.info(`Connected to ${this.options.name}`);

        // 发送订阅消息
        if (this.options.subscribeMessage) {
          this.ws.send(JSON.stringify(this.options.subscribeMessage));
        }

        // 设置心跳检测
        this.heartbeatInterval = setInterval(() => {
          if (this.ws.readyState === WebSocket.OPEN) {
            if (this.options.pingMessage) {
              this.ws.send(this.options.pingMessage);
            }
          }
        }, this.options.pingInterval || 30000);
      });

      this.ws.on("message", (data) => {
        try {
          if (this.options.name === "Binance" && data.toString() === "ping") {
            this.ws.send("pong");
          }
          this.options.onMessage(data);
        } catch (error) {
          logger.error(`${this.options.name} 消息处理错误:`, error);
        }
      });

      this.ws.on("close", () => {
        logger.warn(`${this.options.name} connection closed. Reconnecting...`);
        clearInterval(this.heartbeatInterval);
        setTimeout(() => this.connect(), this.reconnectDelay);
      });

      this.ws.on("error", (error) => {
        logger.error(`${this.options.name} WebSocket 错误:`, error);
      });
    } catch (error) {
      logger.error(`${this.options.name} 连接创建失败:`, error);
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  close() {
    try {
      if (this.ws) {
        clearInterval(this.heartbeatInterval);
        this.ws.terminate(); // 使用 terminate 来强制关闭连接
        this.ws.close(); // 正常关闭连接
        this.ws = null;
      }
    } catch (error) {
      logger.error(`${this.options.name} 关闭连接错误:`, error);
    }
  }
}

// 创建交易管理对象
const tradeManager = {
  position: {
    size: 0,
    type: null,
    binancePrice: 0,
    bitgetPrice: 0,
    liquidationPrice: 0,
    stopLossPrice: 0,
  },
  fees: config.fees,
  trader:
    config.mode === "live"
      ? new LiveTrader(config.exchanges)
      : new SimulatedTrader(),

  // 检查是否可以开仓
  canOpenPosition() {
    return this.position.size === 0;
  },

  // 修改获取可下单数量的方法
  getOrderSize(binanceQty, bitgetQty, price) {
    const availableSize = Math.min(
      parseFloat(binanceQty),
      parseFloat(bitgetQty)
    );
    const sizeWithRatio = availableSize * config.trading.orderSizeRatio;
    const maxSizeByAmount =
      (config.trading.maxPositionAmount * config.trading.leverage) / price;
    const finalSize = Math.min(sizeWithRatio, maxSizeByAmount);

    return finalSize < config.trading.minOrderSize ? 0 : finalSize.toFixed(2);
  },

  calculateLiquidationPrice(entryPrice, size, balance) {
    const contractValue = entryPrice * size; // 合约价值
    const maintenanceMarginRate = 0.005; // 维持保证金率
    const maintenanceMargin = contractValue * maintenanceMarginRate; // 维持保证金

    // 对于做多，价格下跌会导致爆仓
    if (this.position.type === "long") {
      return entryPrice * (1 - (balance - maintenanceMargin) / contractValue);
    } else {
      return entryPrice * (1 + (balance - maintenanceMargin) / contractValue);
    }
  },

  async openPosition(type, size, binancePrice, bitgetPrice) {
    // 如果size为0，取消开仓
    if (size <= 0) {
      logger.info("下单数量小于最小限制，取消开仓");
      return false;
    }
    try {
      const success = await this.trader.openPosition(
        type,
        size,
        binancePrice,
        bitgetPrice
      );
      if (success) {
        if (config.mode === "live") {
          // 实盘模式才计算爆仓价格和止损价格
          const balance = await this.trader.getAccountBalance();
          const liquidationPrice = this.calculateLiquidationPrice(
            type === "long" ? binancePrice : bitgetPrice,
            size,
            balance
          );
          const stopLossPrice =
            type === "long"
              ? liquidationPrice +
                (binancePrice - liquidationPrice) *
                  config.trading.stopLossPercentage
              : liquidationPrice -
                (liquidationPrice - bitgetPrice) *
                  config.trading.stopLossPercentage;

          this.position = {
            size,
            type,
            binancePrice,
            bitgetPrice,
            liquidationPrice,
            stopLossPrice,
          };

          logger.info("开仓信息:", {
            type,
            size,
            binancePrice,
            bitgetPrice,
            liquidationPrice,
            stopLossPrice,
          });
        } else {
          // 模拟交易模式只记录基本信息
          this.position = {
            size,
            type,
            binancePrice,
            bitgetPrice,
            liquidationPrice: 0,
            stopLossPrice: 0,
          };
        }
      }
    } catch (error) {
      logger.error("开仓发生异常", error);
    }
  },

  // 检查是否需要止损
  checkStopLoss(binancePrice, bitgetPrice) {
    if (!this.position.size || config.mode !== "live") return false;

    if (this.position.type === "long") {
      // 做多持仓需要同时监控：
      // 1. 币安买一价，因为在币安做多
      // 2. Bitget卖一价，因为在Bitget做空
      return (
        binancePrice <= this.position.stopLossPrice ||
        bitgetPrice >= this.position.stopLossPrice
      );
    } else {
      // 做空持仓需要同时监控：
      // 1. 币安卖一价，因为在币安做空
      // 2. Bitget买一价，因为在Bitget做多
      return (
        binancePrice >= this.position.stopLossPrice ||
        bitgetPrice <= this.position.stopLossPrice
      );
    }
  },

  // 修复 closePosition 方法的位置和语法
  async closePosition(availableSize, binancePrice, bitgetPrice) {
    const closeSize = Math.min(this.position.size, availableSize);
    const success = await this.trader.closePosition(
      this.position.type,
      closeSize,
      binancePrice,
      bitgetPrice
    );

    if (success) {
      this.position.size -= closeSize;
      if (this.position.size === 0) {
        this.position.type = null;
        this.position.binancePrice = 0;
        this.position.bitgetPrice = 0;
        this.position.liquidationPrice = 0;
        this.position.stopLossPrice = 0;
      }
    }
  },
};

// 修改价格监控对象
const priceMonitor = {
  binance: { bids: [], asks: [] },
  bitget: { bids: [], asks: [] },
  threshold: config.threshold,

  async checkPriceDifference() {
    // 检查两个交易所的连接状态
    if (!binanceClient.isConnected || !bitgetClient.isConnected) {
      logger.warn("交易所连接断开，跳过本次检查");
      return;
    }
    // 添加价格有效性检查
    if (
      !this.isValidPrice(this.binance.asks) ||
      !this.isValidPrice(this.binance.bids) ||
      !this.isValidPrice(this.bitget.asks) ||
      !this.isValidPrice(this.bitget.bids)
    ) {
      logger.warn("检测到无效价格，跳过本次检查");
      return;
    }

    // 获取两个交易所的买卖价格
    const binanceBid = parseFloat(this.binance.bids[0][0]); // 币安买一价（可以用来做空）
    const binanceAsk = parseFloat(this.binance.asks[0][0]); // 币安卖一价（可以用来做多）
    const bitgetBid = parseFloat(this.bitget.bids[0][0]); // Bitget买一价（可以用来做空）
    const bitgetAsk = parseFloat(this.bitget.asks[0][0]); // Bitget卖一价（可以用来做多）

    // 如果没有持仓，检查开仓机会
    if (tradeManager.canOpenPosition()) {
      // 计算币安做空-Bitget做多的价差
      const diff1 = (binanceBid - bitgetAsk) / bitgetAsk;
      if (diff1 > this.threshold.open) {
        const size = tradeManager.getOrderSize(
          this.binance.bids[0][1],
          this.bitget.asks[0][1],
          bitgetAsk
        );
        await tradeManager.openPosition("short", size, binanceBid, bitgetAsk);
        return;
      }

      // 计算Bitget做空-币安做多的价差
      const diff2 = (bitgetBid - binanceAsk) / binanceAsk;
      if (diff2 > this.threshold.open) {
        const size = tradeManager.getOrderSize(
          this.binance.asks[0][1],
          this.bitget.bids[0][1],
          binanceAsk
        );
        await tradeManager.openPosition("long", size, binanceAsk, bitgetBid);
        return;
      }
    }

    // 检查平仓条件
    if (tradeManager.position.size > 0) {
      if (tradeManager.position.type === "long") {
        // 做多持仓平仓：币安Bid卖出 > Bitget Ask买入
        const closeDiff = (binanceBid - bitgetAsk) / bitgetAsk;
        if (closeDiff > this.threshold.close) {
          await tradeManager.closePosition(
            tradeManager.position.size,
            binanceBid, // 币安以买一价卖出平仓
            bitgetAsk // Bitget以卖一价买入平仓
          );
          return;
        }
      } else {
        // 做空持仓平仓：Bitget Bid卖出 > 币安Ask买入
        const closeDiff = (bitgetBid - binanceAsk) / binanceAsk;
        if (closeDiff > this.threshold.close) {
          await tradeManager.closePosition(
            tradeManager.position.size,
            binanceAsk, // 币安以卖一价买入平仓
            bitgetBid // Bitget以买一价卖出平仓
          );
          return;
        }
      }

      // 检查止损条件
      if (
        tradeManager.checkStopLoss(
          tradeManager.position.type === "long" ? binanceBid : binanceAsk,
          tradeManager.position.type === "long" ? bitgetAsk : bitgetBid
        )
      ) {
        await tradeManager.closePosition(
          tradeManager.position.size,
          tradeManager.position.type === "long" ? binanceBid : binanceAsk,
          tradeManager.position.type === "long" ? bitgetAsk : bitgetBid
        );
      }
    }
  },

  // 添加价格检查方法
  isValidPrice(priceLevel) {
    return (
      priceLevel &&
      priceLevel.length > 0 &&
      !isNaN(parseFloat(priceLevel[0][0])) &&
      parseFloat(priceLevel[0][0]) > 0
    );
  },
};

// 修改币安客户端的消息处理
const binanceClient = new WebSocketClient(
  `wss://fstream.binance.com/ws/${config.symbol.toLowerCase()}@depth5`,
  {
    name: "Binance",
    onMessage: async (data) => {
      var msg = data.toString();
      if (msg === "ping") return;
      const message = JSON.parse(msg);
      if (message.e === "depthUpdate") {
        priceMonitor.binance.bids = message.b;
        priceMonitor.binance.asks = message.a;
        await priceMonitor.checkPriceDifference();
      }
    },
  }
);

const bitgetClient = new WebSocketClient("wss://ws.bitget.com/v2/ws/public", {
  name: "Bitget",
  subscribeMessage: {
    op: "subscribe",
    args: [
      {
        instType: "USDT-FUTURES",
        channel: "books5",
        instId: config.symbol,
      },
    ],
  },
  pingMessage: "ping",
  pingInterval: config.pingInterval,
  onMessage: async (data) => {
    if (data.toString() !== "pong") {
      const message = JSON.parse(data.toString());
      if (message.action === "snapshot") {
        const books = message.data[0];
        priceMonitor.bitget.asks = books.asks;
        priceMonitor.bitget.bids = books.bids;
        await priceMonitor.checkPriceDifference();
      }
    }
  },
});

// 优雅退出
// 修改优雅退出的处理
process.on("SIGINT", () => {
  logger.info("正在关闭 WebSocket 连接...");
  try {
    if (binanceClient && typeof binanceClient.close === "function") {
      binanceClient.close();
    }
    if (bitgetClient && typeof bitgetClient.close === "function") {
      bitgetClient.close();
    }
  } catch (error) {
    logger.error("关闭连接时发生错误:", error);
  } finally {
    process.exit(0);
  }
});
