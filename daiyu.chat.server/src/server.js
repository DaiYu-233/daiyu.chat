const { findAvailablePort } = require('./utils/checkPort');
const config = require('./config/config.json');
const fs = require('fs');
const path = require('path');

async function startServer() {
    try {
        // 检查端口是否可用
        const port = await findAvailablePort(config.server.port);

        if (port !== config.server.port) {
            console.log(`端口 ${config.server.port} 已被占用，使用新端口 ${port}`);
            // 更新配置文件
            config.server.port = port;
            fs.writeFileSync(
                path.join(__dirname, 'config/config.json'),
                JSON.stringify(config, null, 2)
            );
        }

        // 启动服务器
        require('./app');

    } catch (error) {
        console.error('启动服务器失败:', error);
        process.exit(1);
    }
}

startServer(); 