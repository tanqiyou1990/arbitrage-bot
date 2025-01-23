const WebSocket = require("ws");
const winston = require("winston");
const config = require("./config");

// 配置日志系统
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

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
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.on("open", () => {
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
  },
  fees: config.fees,

  // 修改获取可下单数量的方法
  getOrderSize(binanceQty, bitgetQty) {
    const availableSize = Math.min(
      parseFloat(binanceQty),
      parseFloat(bitgetQty)
    );
    // 应用下单数量比例限制
    const sizeWithRatio = availableSize * config.orderSizeRatio;
    // 最后和最大持仓限制比较，并保留两位小数
    return Math.min(sizeWithRatio, config.maxPositionSize).toFixed(2);
  },

  // 检查是否可以开仓
  canOpenPosition() {
    return this.position.size === 0;
  },

  // 开仓
  openPosition(type, size, binancePrice, bitgetPrice) {
    this.position = {
      size,
      type,
      binancePrice,
      bitgetPrice,
    };
    console.log(
      "\x1b[32m%s\x1b[0m",
      `开仓：${
        type === "long" ? "Binance做多-Bitget做空" : "Bitget做多-Binance做空"
      }`
    );
    console.log(`数量：${size}`);
    console.log(`Binance价格：${binancePrice}`);
    console.log(`Bitget价格：${bitgetPrice}`);
  },

  // 平仓
  // 修改平仓方法，添加利润计算
  closePosition(availableSize, binancePrice, bitgetPrice) {
    const closeSize = Math.min(this.position.size, availableSize);
    this.position.size -= closeSize;

    // 计算利润（包含手续费）
    let binanceProfit = 0;
    let bitgetProfit = 0;
    let totalProfit = 0;
    let binanceFees = 0;
    let bitgetFees = 0;

    if (this.position.type === "long") {
      // Binance做多，Bitget做空的情况
      // Binance: 开仓买入手续费 + 平仓卖出手续费
      binanceFees =
        closeSize * this.position.binancePrice * this.fees.binance +
        closeSize * binancePrice * this.fees.binance;
      // Bitget: 开仓卖出手续费 + 平仓买入手续费
      bitgetFees =
        closeSize * this.position.bitgetPrice * this.fees.bitget +
        closeSize * bitgetPrice * this.fees.bitget;

      binanceProfit =
        closeSize * (binancePrice - this.position.binancePrice) - binanceFees;
      bitgetProfit =
        closeSize * (this.position.bitgetPrice - bitgetPrice) - bitgetFees;
    } else {
      // Bitget做多，Binance做空的情况
      // Binance: 开仓卖出手续费 + 平仓买入手续费
      binanceFees =
        closeSize * this.position.binancePrice * this.fees.binance +
        closeSize * binancePrice * this.fees.binance;
      // Bitget: 开仓买入手续费 + 平仓卖出手续费
      bitgetFees =
        closeSize * this.position.bitgetPrice * this.fees.bitget +
        closeSize * bitgetPrice * this.fees.bitget;

      binanceProfit =
        closeSize * (this.position.binancePrice - binancePrice) - binanceFees;
      bitgetProfit =
        closeSize * (bitgetPrice - this.position.bitgetPrice) - bitgetFees;
    }

    totalProfit = binanceProfit + bitgetProfit;

    console.log(
      "\x1b[33m%s\x1b[0m",
      `平仓：${closeSize}/${this.position.size}`
    );
    console.log(`Binance价格：${binancePrice}`);
    console.log(`Bitget价格：${bitgetPrice}`);
    console.log("\x1b[36m%s\x1b[0m", `本次平仓利润：`);
    console.log(`Binance利润(含手续费)：${binanceProfit.toFixed(4)} USDT`);
    console.log(`Binance手续费：${binanceFees.toFixed(4)} USDT`);
    console.log(`Bitget利润(含手续费)：${bitgetProfit.toFixed(4)} USDT`);
    console.log(`Bitget手续费：${bitgetFees.toFixed(4)} USDT`);
    console.log(`总手续费：${(binanceFees + bitgetFees).toFixed(4)} USDT`);
    console.log(`总利润(含手续费)：${totalProfit.toFixed(4)} USDT`);

    if (this.position.size === 0) {
      this.position.type = null;
      this.position.binancePrice = 0;
      this.position.bitgetPrice = 0;
    }
  },
};

// 修改价格监控对象
const priceMonitor = {
  binance: { bids: [], asks: [] },
  bitget: { bids: [], asks: [] },
  threshold: config.threshold,

  checkPriceDifference() {
    // 计算第一组价差（Binance做多-Bitget做空）
    if (this.binance.asks.length && this.bitget.bids.length) {
      const binanceBuyPrice = parseFloat(this.binance.asks[0][0]);
      const bitgetSellPrice = parseFloat(this.bitget.bids[0][0]);
      const binanceQty = this.binance.asks[0][1];
      const bitgetQty = this.bitget.bids[0][1];
      const diff1 = (bitgetSellPrice - binanceBuyPrice) / binanceBuyPrice;

      // Bitget买一价 > Binance卖一价，可以做多Binance-做空Bitget
      if (diff1 > this.threshold && tradeManager.canOpenPosition()) {
        const size = tradeManager.getOrderSize(binanceQty, bitgetQty);
        tradeManager.openPosition(
          "long",
          size,
          binanceBuyPrice,
          bitgetSellPrice
        );
      }
    }

    // 计算第二组价差（Bitget做多-Binance做空）
    if (this.binance.bids.length && this.bitget.asks.length) {
      const bitgetBuyPrice = parseFloat(this.bitget.asks[0][0]);
      const binanceSellPrice = parseFloat(this.binance.bids[0][0]);
      const binanceQty = this.binance.bids[0][1];
      const bitgetQty = this.bitget.asks[0][1];
      const diff2 = (binanceSellPrice - bitgetBuyPrice) / bitgetBuyPrice;

      // Binance买一价 > Bitget卖一价，可以做多Bitget-做空Binance
      if (diff2 > this.threshold && tradeManager.canOpenPosition()) {
        const size = tradeManager.getOrderSize(binanceQty, bitgetQty);
        tradeManager.openPosition(
          "short",
          size,
          binanceSellPrice,
          bitgetBuyPrice
        );
      }
    }

    // 检查平仓条件
    if (tradeManager.position.size > 0) {
      if (
        tradeManager.position.type === "long" &&
        this.binance.bids.length &&
        this.bitget.asks.length
      ) {
        // 如果持有 long 仓位（Binance做多-Bitget做空），检查反向价差
        const bitgetBuyPrice = parseFloat(this.bitget.asks[0][0]);
        const binanceSellPrice = parseFloat(this.binance.bids[0][0]);
        const diff = (binanceSellPrice - bitgetBuyPrice) / bitgetBuyPrice;

        if (diff > this.threshold) {
          const availableSize = tradeManager.getOrderSize(
            this.binance.bids[0][1],
            this.bitget.asks[0][1]
          );
          tradeManager.closePosition(
            availableSize,
            binanceSellPrice,
            bitgetBuyPrice
          );
        }
      } else if (
        tradeManager.position.type === "short" &&
        this.binance.asks.length &&
        this.bitget.bids.length
      ) {
        // 如果持有 short 仓位（Bitget做多-Binance做空），检查反向价差
        const binanceBuyPrice = parseFloat(this.binance.asks[0][0]);
        const bitgetSellPrice = parseFloat(this.bitget.bids[0][0]);
        const diff = (bitgetSellPrice - binanceBuyPrice) / binanceBuyPrice;

        if (diff > this.threshold) {
          const availableSize = tradeManager.getOrderSize(
            this.binance.asks[0][1],
            this.bitget.bids[0][1]
          );
          tradeManager.closePosition(
            availableSize,
            binanceBuyPrice,
            bitgetSellPrice
          );
        }
      }
    }
  },
};

// 修改币安客户端的消息处理
const binanceClient = new WebSocketClient(
  "wss://fstream.binance.com/ws/ethusdt@depth5",
  {
    name: "Binance",
    onMessage: (data) => {
      var msg = data.toString();
      if (msg === "ping") return;
      const message = JSON.parse(msg);
      if (message.e === "depthUpdate") {
        priceMonitor.binance.bids = message.b;
        priceMonitor.binance.asks = message.a;
        priceMonitor.checkPriceDifference();
      }
    },
  }
);

// 修改 Bitget 客户端的消息处理
const bitgetClient = new WebSocketClient("wss://ws.bitget.com/v2/ws/public", {
  name: "Bitget",
  subscribeMessage: {
    op: "subscribe",
    args: [
      {
        instType: "USDT-FUTURES",
        channel: "books5",
        instId: "ETHUSDT",
      },
    ],
  },
  pingMessage: "ping",
  pingInterval: config.pingInterval,
  onMessage: (data) => {
    if (data.toString() !== "pong") {
      const message = JSON.parse(data.toString());
      if (message.action === "snapshot") {
        const books = message.data[0];
        priceMonitor.bitget.asks = books.asks;
        priceMonitor.bitget.bids = books.bids;
        priceMonitor.checkPriceDifference();
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
