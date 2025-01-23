const axios = require("axios");
const crypto = require("crypto");

class BinanceAPI {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.baseUrl = "https://fapi.binance.com";
  }

  // 生成签名
  generateSignature(params) {
    const queryString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(queryString)
      .digest("hex");
  }

  // 开多仓
  async openLong(symbol, quantity) {
    const endpoint = "/fapi/v1/order";
    const timestamp = Date.now();
    const params = {
      symbol: symbol,
      side: "BUY",
      type: "MARKET",
      quantity: quantity,
      timestamp: timestamp,
    };

    const signature = this.generateSignature(params);
    const url = `${this.baseUrl}${endpoint}?${new URLSearchParams(
      params
    ).toString()}&signature=${signature}`;

    const response = await axios.post(url, null, {
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
    });
    return response.data;
  }

  // 开空仓
  async openShort(symbol, quantity) {
    const endpoint = "/fapi/v1/order";
    const timestamp = Date.now();
    const params = {
      symbol: symbol,
      side: "SELL",
      type: "MARKET",
      quantity: quantity,
      timestamp: timestamp,
    };

    const signature = this.generateSignature(params);
    const url = `${this.baseUrl}${endpoint}?${new URLSearchParams(
      params
    ).toString()}&signature=${signature}`;

    const response = await axios.post(url, null, {
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
    });
    return response.data;
  }

  // 平多仓
  async closeLong(symbol, quantity) {
    return this.openShort(symbol, quantity);
  }

  // 平空仓
  async closeShort(symbol, quantity) {
    return this.openLong(symbol, quantity);
  }

  async setLeverage(symbol, leverage) {
    const endpoint = "/fapi/v1/leverage";
    const timestamp = Date.now();
    const params = {
      symbol: symbol,
      leverage: leverage,
      timestamp: timestamp,
    };

    const signature = this.generateSignature(params);
    const url = `${this.baseUrl}${endpoint}?${new URLSearchParams(
      params
    ).toString()}&signature=${signature}`;

    const response = await axios.post(url, null, {
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
    });
    return response.data;
  }

  async getAccountBalance() {
    const endpoint = "/fapi/v2/account";
    const timestamp = Date.now();
    const params = { timestamp };
    const signature = this.generateSignature(params);
    const url = `${this.baseUrl}${endpoint}?${new URLSearchParams(
      params
    ).toString()}&signature=${signature}`;

    const response = await axios.get(url, {
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
    });
    return response.data;
  }
}

module.exports = BinanceAPI;
