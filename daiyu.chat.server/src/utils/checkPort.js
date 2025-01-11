const net = require('net');
const config = require('../config/config.json');

function checkPort(port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                reject(err);
            }
        });

        server.once('listening', () => {
            server.close();
            resolve(true);
        });

        server.listen(port);
    });
}

async function findAvailablePort(startPort) {
    let port = startPort;
    while (!(await checkPort(port))) {
        port++;
    }
    return port;
}

module.exports = { checkPort, findAvailablePort }; 