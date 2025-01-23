FROM node:18-alpine

WORKDIR /app

# 安装 PM2
RUN npm install pm2 -g

# 复制项目文件
COPY package*.json ./
COPY ecosystem.config.js ./
COPY src ./src

# 安装依赖
RUN npm install

# 创建日志目录
RUN mkdir -p logs

# 启动应用
CMD ["pm2-runtime", "ecosystem.config.js"]