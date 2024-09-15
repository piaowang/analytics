# 数果星盘
大数据可视化分析

## using
Write by ES6/7 
 
Service: KOA2 + Postgresql + 
Front-end: React + React-Router + Redux + Antd + Fetch + Webpack

## 开发

```
# 先安装git git-extras nvm git-gui
安装nvm查看https://github.com/nvm-sh/nvm/blob/master/README.md
比如：curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
安装后如果执行`command -v nvm`或`nvm`后没有信息或提示nvm: command not found，可能需要`source ~/.bashrc`

# 使用nvm安装node
nvm install stable
# 使用本地npm
npm set registry http://192.168.0.202:4873

git clone git@github.com:Datafruit/sugo-analytics.git
cd sugo-analytics
npm run i
cp config.sample.js config.js

# start server
npm run dev:server

# start client (新开一个窗口运行) 会自动打开浏览器
npm run dev:client

# 本地配置请编辑config.js(已加入忽略文件)
# 默认配置编辑config.default.js

```

## 构建和打包

```bash

#构建
npm run clean
npm run deploy

#打包

#全部扩展包打包
npm run pack

#只针对部分扩展包打包
PACK_NAME=saas,wxj npm run pack

#打包加入nodejs可执行文件 path/to/node-folder内应该有 bin目录，bin目录下应该有node可执行文件
NODE_PACK_PATH=path/to/node-folder PACK_NAME=saas,wxj npm run pack

```

# nginx代理websocket协议
```
# proxy websocket
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;

server {
    listen 1180;
    location / {
        add_header 'Access-Control-Allow-Origin' $http_origin;
        add_header 'Access-Control-Allow-Credentials' 'true';
        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept';
        add_header 'Access-Control-Allow-Methods' 'GET,POST,OPTIONS,PUT,DELETE';
        proxy_pass http://192.168.0.118:8000;
        proxy_buffering off;
        proxy_set_header        Host            $host;
        proxy_set_header        X-Real-Ip       $remote_addr;
        proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;

        # proxy websocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

