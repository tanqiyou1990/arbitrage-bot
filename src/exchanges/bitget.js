const axios = require("axios");
const crypto = require("crypto");

class BitgetAPI {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.passphrase = config.passphrase;
    this.baseUrl = "https://api.bitget.com";
  }

  // 生成签名
  generateSignature(timestamp, method, requestPath, body = "") {
    const message = timestamp + method + requestPath + body;
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(message)
      .digest("base64");
  }

  // 开多仓
  async openLong(symbol, size) {
    const endpoint = "/api/mix/v1/order/placeOrder";
    const timestamp = Date.now().toString();
    const body = {
      symbol: symbol,
      marginCoin: "USDT",
      size: size,
      side: "1", // 开多
      orderType: "market",
    };

    const signature = this.generateSignature(
      timestamp,
      "POST",
      endpoint,
      JSON.stringify(body)
    );

    const response = await axios.post(`${this.baseUrl}${endpoint}`, body, {
      headers: {
        "ACCESS-KEY": this.apiKey,
        "ACCESS-SIGN": signature,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-PASSPHRASE": this.passphrase,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  }

  // 开空仓
  async openShort(symbol, size) {
    const endpoint = "/api/mix/v1/order/placeOrder";
    const timestamp = Date.now().toString();
    const body = {
      symbol: symbol,
      marginCoin: "USDT",
      size: size,
      side: "2", // 开空
      orderType: "market",
    };

    const signature = this.generateSignature(
      timestamp,
      "POST",
      endpoint,
      JSON.stringify(body)
    );

    const response = await axios.post(`${this.baseUrl}${endpoint}`, body, {
      headers: {
        "ACCESS-KEY": this.apiKey,
        "ACCESS-SIGN": signature,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-PASSPHRASE": this.passphrase,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  }

  // 平多仓
  async closeLong(symbol, size) {
    const endpoint = "/api/mix/v1/order/placeOrder";
    const timestamp = Date.now().toString();
    const body = {
      symbol: symbol,
      marginCoin: "USDT",
      size: size,
      side: "3", // 平多
      orderType: "market",
    };

    const signature = this.generateSignature(
      timestamp,
      "POST",
      endpoint,
      JSON.stringify(body)
    );

    const response = await axios.post(`${this.baseUrl}${endpoint}`, body, {
      headers: {
        "ACCESS-KEY": this.apiKey,
        "ACCESS-SIGN": signature,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-PASSPHRASE": this.passphrase,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  }

  // 平空仓
  async closeShort(symbol, size) {
    const endpoint = "/api/mix/v1/order/placeOrder";
    const timestamp = Date.now().toString();
    const body = {
      symbol: symbol,
      marginCoin: "USDT",
      size: size,
      side: "4", // 平空
      orderType: "market",
    };

    const signature = this.generateSignature(
      timestamp,
      "POST",
      endpoint,
      JSON.stringify(body)
    );

    const response = await axios.post(`${this.baseUrl}${endpoint}`, body, {
      headers: {
        "ACCESS-KEY": this.apiKey,
        "ACCESS-SIGN": signature,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-PASSPHRASE": this.passphrase,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  }

  async setLeverage(symbol, leverage) {
    const endpoint = "/api/mix/v1/account/setLeverage";
    const timestamp = Date.now().toString();
    const body = {
      symbol: symbol,
      marginCoin: "USDT",
      leverage: leverage,
    };

    const signature = this.generateSignature(
      timestamp,
      "POST",
      endpoint,
      JSON.stringify(body)
    );

    const response = await axios.post(`${this.baseUrl}${endpoint}`, body, {
      headers: {
        "ACCESS-KEY": this.apiKey,
        "ACCESS-SIGN": signature,
        "ACCESS-TIMESTAMP": timestamp,
        "ACCESS-PASSPHRASE": this.passphrase,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  }
}

module.exports = BitgetAPI;
