const axios = require("axios");
const config = require("../config");
const BinanceAPI = require("./binance");
const BitgetAPI = require("./bitget");
const logger = require("../logger"); // 修改为正确的相对路径

// 实盘交易类
class LiveTrader {
  constructor(config) {
    this.binanceAPI = new BinanceAPI(config.binance);
    this.bitgetAPI = new BitgetAPI(config.bitget);
    this.symbol = config.symbol;
    this.leverage = config.leverage;

    // 初始化时设置杠杆倍数
    this.initLeverage();
  }

  async initLeverage() {
    try {
      // 设置币安杠杆
      await this.binanceAPI.setLeverage(this.symbol, this.leverage);
      // 设置Bitget杠杆
      await this.bitgetAPI.setLeverage(this.symbol, this.leverage);
      logger.info(`设置杠杆倍数成功: ${this.leverage}倍`);
    } catch (error) {
      logger.error("设置杠杆倍数失败:", error);
    }
  }

  async binanceLongOrder(size, price) {
    try {
      const response = await this.binanceAPI.openLong(this.symbol, size);
      logger.info("Binance开多成功:", response);
      return true;
    } catch (error) {
      logger.error("Binance开多失败:", error);
      return false;
    }
  }

  async binanceShortOrder(size, price) {
    try {
      const response = await this.binanceAPI.openShort(this.symbol, size);
      logger.info("Binance开空成功:", response);
      return true;
    } catch (error) {
      logger.error("Binance开空失败:", error);
      return false;
    }
  }

  async bitgetLongOrder(size, price) {
    try {
      const response = await this.bitgetAPI.openLong(this.symbol, size);
      logger.info("Bitget开多成功:", response);
      return true;
    } catch (error) {
      logger.error("Bitget开多失败:", error);
      return false;
    }
  }

  async bitgetShortOrder(size, price) {
    try {
      const response = await this.bitgetAPI.openShort(this.symbol, size);
      logger.info("Bitget开空成功:", response);
      return true;
    } catch (error) {
      logger.error("Bitget开空失败:", error);
      return false;
    }
  }

  async binanceCloseOrder(size, price, positionType) {
    try {
      const response =
        positionType === "long"
          ? await this.binanceAPI.closeLong(this.symbol, size)
          : await this.binanceAPI.closeShort(this.symbol, size);
      logger.info("Binance平仓成功:", response);
      return true;
    } catch (error) {
      logger.error("Binance平仓失败:", error);
      return false;
    }
  }

  async bitgetCloseOrder(size, price, positionType) {
    try {
      const response =
        positionType === "long"
          ? await this.bitgetAPI.closeLong(this.symbol, size)
          : await this.bitgetAPI.closeShort(this.symbol, size);
      logger.info("Bitget平仓成功:", response);
      return true;
    } catch (error) {
      logger.error("Bitget平仓失败:", error);
      return false;
    }
  }
}

// 模拟交易类
class SimulatedTrader {
  constructor() {
    this.position = {
      size: 0,
      type: null,
      binancePrice: 0,
      bitgetPrice: 0,
    };
    this.fees = config.fees;
    // 添加模拟账户余额
    this.balance = 10000; // 模拟10000USDT初始资金
  }

  async openPosition(type, size, binancePrice, bitgetPrice) {
    // 保存开仓信息，用于后续计算盈亏
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
    console.log(`账户余额：${this.balance} USDT`);
    console.log(
      `保证金使用：${((size * binancePrice) / config.leverage).toFixed(2)} USDT`
    );
    return true;
  }

  async closePosition(type, size, binancePrice, bitgetPrice) {
    // 计算利润（包含手续费）
    let binanceProfit = 0;
    let bitgetProfit = 0;
    let totalProfit = 0;
    let binanceFees = 0;
    let bitgetFees = 0;

    if (type === "long") {
      // Binance做多，Bitget做空的情况
      binanceFees =
        size * this.position.binancePrice * this.fees.binance +
        size * binancePrice * this.fees.binance;
      bitgetFees =
        size * this.position.bitgetPrice * this.fees.bitget +
        size * bitgetPrice * this.fees.bitget;

      binanceProfit =
        size * (binancePrice - this.position.binancePrice) - binanceFees;
      bitgetProfit =
        size * (this.position.bitgetPrice - bitgetPrice) - bitgetFees;
    } else {
      // Bitget做多，Binance做空的情况
      binanceFees =
        size * this.position.binancePrice * this.fees.binance +
        size * binancePrice * this.fees.binance;
      bitgetFees =
        size * this.position.bitgetPrice * this.fees.bitget +
        size * bitgetPrice * this.fees.bitget;

      binanceProfit =
        size * (this.position.binancePrice - binancePrice) - binanceFees;
      bitgetProfit =
        size * (bitgetPrice - this.position.bitgetPrice) - bitgetFees;
    }

    totalProfit = binanceProfit + bitgetProfit;

    console.log("\x1b[33m%s\x1b[0m", `平仓：${size}`);
    console.log(`Binance价格：${binancePrice}`);
    console.log(`Bitget价格：${bitgetPrice}`);
    console.log("\x1b[36m%s\x1b[0m", `本次平仓利润：`);
    console.log(`Binance利润(含手续费)：${binanceProfit.toFixed(4)} USDT`);
    console.log(`Binance手续费：${binanceFees.toFixed(4)} USDT`);
    console.log(`Bitget利润(含手续费)：${bitgetProfit.toFixed(4)} USDT`);
    console.log(`Bitget手续费：${bitgetFees.toFixed(4)} USDT`);
    console.log(`总手续费：${(binanceFees + bitgetFees).toFixed(4)} USDT`);
    console.log(`总利润(含手续费)：${totalProfit.toFixed(4)} USDT`);

    return true;
  }
}

module.exports = {
  LiveTrader,
  SimulatedTrader,
};
