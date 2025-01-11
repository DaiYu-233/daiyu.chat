const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const config = require('./config/config.json');
const mime = require('mime-types');

const app = express();
const server = http.createServer(app);

// 首先配置基础中间件
app.use(express.json());
app.use(cookieParser());

// CORS 配置 - 确保在其他中间件之前
app.use(cors({
    origin: config.client.url,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
}));

// Socket.IO 配置
const io = new Server(server, {
    cors: {
        origin: config.client.url,
        credentials: true,
        methods: ['GET', 'POST']
    }
});

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 管理员认证中间件
const requireAdmin = (req, res, next) => {
    if (!req.cookies || req.cookies.adminAuth !== 'true') {
        return res.status(401).json({ error: '未授权' });
    }
    next();
};

// 登录路由 - 不需要认证
app.post('/admin/login', (req, res) => {
    console.log('收到登录请求:', req.body);
    const { password } = req.body;

    if (password === config.admin.password) {
        res.cookie('adminAuth', 'true', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000
        });
        console.log('登录成功，设置 cookie');
        res.json({ success: true });
    } else {
        console.log('密码不匹配 - 输入:', password, '期望:', config.admin.password);
        res.status(401).json({ error: '密码错误' });
    }
});

// 检查管理员状态
app.get('/admin/check', (req, res) => {
    const isAdmin = req.cookies && req.cookies.adminAuth === 'true';
    if (isAdmin) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: '未授权' });
    }
});

// 需要管理员权限的路由
app.use('/admin/*', requireAdmin);

// 清理上传文件夹
const cleanUploadFolder = () => {
    const uploadDir = path.join(__dirname, '../uploads');

    // 如果文件夹不存在，创建它
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        return;
    }

    // 删除文件夹中的所有文件
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('读取上传文件夹失败:', err);
            return;
        }

        for (const file of files) {
            fs.unlink(path.join(uploadDir, file), err => {
                if (err) console.error('删除文件失败:', err);
            });
        }
    });
};

// 定期清理过期文件
const cleanExpiredFiles = () => {
    const uploadDir = path.join(__dirname, '../uploads');
    const expirationTime = 10 * 60 * 1000; // 10分钟

    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('读取上传文件夹失败:', err);
            return;
        }

        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(uploadDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error('获取文件状态失败:', err);
                    return;
                }

                if (now - stats.mtimeMs > expirationTime) {
                    fs.unlink(filePath, err => {
                        if (err) console.error('删除过期文件失败:', err);
                        else console.log('已删除过期文件:', file);
                    });
                }
            });
        });
    });
};

// 启动时清理文件夹
cleanUploadFolder();

// 每分钟检查一次过期文件
setInterval(cleanExpiredFiles, 60 * 1000);

// 添加文件名编码处理函数
function encodeFileName(fileName) {
    // 分离文件名和扩展名
    const ext = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, ext);
    // 只对文件名部分进行编码，保留扩展名
    return Buffer.from(nameWithoutExt, 'utf8').toString('hex') + ext;
}

function decodeFileName(encodedName) {
    // 分离编码的文件名和扩展名
    const ext = path.extname(encodedName);
    const encodedNameWithoutExt = path.basename(encodedName, ext);
    // 只解码文件名部分
    return Buffer.from(encodedNameWithoutExt, 'hex').toString('utf8') + ext;
}

// 修改文件上传配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 对原始文件名进行编码
        const encodedName = encodeFileName(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${encodedName}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // 设置原始文件名的编码
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, true);
    }
});

// 存储用户和消息
const onlineUsers = new Map();
const chatHistory = [];

// Socket.IO 认证中间件
io.use((socket, next) => {
    const isAdmin = socket.handshake.auth.admin;
    if (isAdmin) {
        // 检查 cookie
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
            return next(new Error('Unauthorized'));
        }

        const cookieParser = require('cookie');
        const parsedCookies = cookieParser.parse(cookies);
        if (parsedCookies.adminAuth !== 'true') {
            return next(new Error('Unauthorized'));
        }
    }
    next();
});

// 管理员 Socket.IO 事件处理
io.on('connection', (socket) => {
    // 判断是否是管理员连接
    const isAdmin = socket.handshake.auth.admin;

    if (isAdmin) {
        console.log('管理员已连接');

        // 处理获取用户列表请求
        socket.on('adminGetUsers', (params) => {
            const { page, pageSize } = params;
            const userArray = Array.from(onlineUsers.values()).map(user => ({
                ...user,
                username: getShortId(user.id)  // 使用短ID
            }));
            const total = userArray.length;
            const start = (page - 1) * pageSize;
            const end = start + pageSize;

            socket.emit('adminUserUpdate', {
                total,
                data: userArray.slice(start, end)
            });
        });

        // 处理获取消息列表请求
        socket.on('adminGetMessages', (params) => {
            const { page, pageSize } = params;
            const total = chatHistory.length;
            const start = (page - 1) * pageSize;
            const end = start + pageSize;

            socket.emit('adminMessageUpdate', {
                total,
                data: chatHistory.slice(start, end).reverse()
            });
        });

        // 处理踢出用户请求
        socket.on('adminKickUser', (data, callback) => {
            const { userId } = data;
            let kicked = false;

            for (const [socketId, user] of onlineUsers.entries()) {
                if (user.id === userId) {
                    const targetSocket = io.sockets.sockets.get(socketId);
                    if (targetSocket) {
                        // 先发送被踢出的消息
                        targetSocket.emit('kicked');

                        // 等待一小段时间后断开连接
                        setTimeout(() => {
                            targetSocket.disconnect(true);
                        }, 100);

                        kicked = true;

                        // 发送系统消息
                        const kickMessage = {
                            type: 'system',
                            content: `${user.username} 已被管理员移出聊天室`,
                            timestamp: Date.now()
                        };
                        chatHistory.push(kickMessage);
                        io.emit('newMessage', kickMessage);
                    }
                    break;
                }
            }

            callback({ success: kicked });
        });

        // 当有新消息时，实时推送给管理员
        socket.on('message', (data) => {
            const messageData = {
                id: data.id,
                username: data.type === 'system' ? 'System' : data.userId,
                content: data.content,
                time: new Date(data.timestamp).toLocaleString('zh-CN')
            };
            socket.emit('adminMessageUpdate', messageData);
        });

        return;
    }

    // 普通用户的连接处理
    console.log('新用户连接:', getShortId(socket.id));  // 使用短ID记录

    socket.on('join', (username) => {
        const shortId = getShortId(socket.id);  // 获取短ID
        console.log('用户加入:', shortId);

        const user = {
            id: socket.id,
            username: shortId  // 使用短ID作为用户名
        };

        onlineUsers.set(socket.id, user);

        const joinMessage = {
            type: 'system',
            content: `用户 ${shortId} 加入了聊天`,  // 使用短ID
            timestamp: Date.now()
        };

        chatHistory.push(joinMessage);
        io.emit('newMessage', joinMessage);

        // 通知管理员用户列表更新
        io.emit('adminUserUpdate', {
            total: onlineUsers.size,
            data: Array.from(onlineUsers.values()).map(user => ({
                ...user,
                username: getShortId(user.id)  // 使用短ID
            }))
        });
    });

    socket.on('message', (msg) => {
        const message = {
            userId: msg.userId,
            content: msg.content,
            timestamp: msg.timestamp
        };

        chatHistory.push(message);
        io.emit('newMessage', message);
    });

    socket.on('disconnect', () => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            const shortId = getShortId(user.id);  // 获取短ID
            const leaveMessage = {
                type: 'system',
                content: `用户 ${shortId} 离开了聊天`,  // 使用短ID
                timestamp: Date.now()
            };

            chatHistory.push(leaveMessage);
            io.emit('newMessage', leaveMessage);

            onlineUsers.delete(socket.id);

            // 通知管理员用户列表更新
            io.emit('adminUserUpdate', {
                total: onlineUsers.size,
                data: Array.from(onlineUsers.values()).map(user => ({
                    ...user,
                    username: getShortId(user.id)  // 使用短ID
                }))
            });
        }
    });
});

// 使用配置的端口和主机
const PORT = process.env.PORT || config.server.port;
const HOST = process.env.HOST || config.server.host;

server.listen(PORT, HOST, () => {
    console.log(`服务器运行在 http://${HOST}:${PORT}`);
});

// 修改文件上传路由
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '没有文件上传' });
    }

    const originalName = req.file.originalname;
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const mimeType = mime.lookup(originalName) || 'application/octet-stream';

    res.json({
        filename: originalName,
        path: fileUrl,
        size: req.file.size,
        type: mimeType
    });
});

// 修改文件下载处理
app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);

    // 从文件名中提取原始文件名
    const match = filename.match(/\d+-\d+-(.*)/);
    if (!match) {
        return res.status(400).send('Invalid filename');
    }

    try {
        const encodedOriginalName = match[1];
        const originalName = decodeFileName(encodedOriginalName);
        const mimeType = mime.lookup(originalName) || 'application/octet-stream';

        // 设置正确的 Content-Type
        res.setHeader('Content-Type', mimeType);

        // 检查是否为强制下载请求
        const forceDownload = req.query.download === 'true';

        // 根据文件类型和请求参数决定是否强制下载
        if (forceDownload || !mimeType.startsWith('image/') && !mimeType.startsWith('text/') && mimeType !== 'application/pdf') {
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`);
        }

        res.sendFile(filePath);
    } catch (error) {
        console.error('处理文件请求失败:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 辅助函数：从完整ID中提取短ID并转换为小写
const getShortId = (fullId) => {
    // 提取最后6个字符作为短ID并转换为小写
    const shortId = fullId.slice(-6).toLowerCase();
    // 确保只包含字母和数字
    return shortId.replace(/[^a-z0-9]/g, '');
};

// 获取用户列表
app.get('/admin/users', requireAdmin, (req, res) => {
    try {
        const connectedUsers = Array.from(io.sockets.sockets.values()).map(socket => ({
            id: socket.id,
            username: getShortId(socket.id)
        }));

        console.log('返回用户列表:', connectedUsers);
        res.json({
            success: true,
            data: connectedUsers
        });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({
            success: false,
            error: '获取用户列表失败'
        });
    }
});

app.get('/admin/chat-history', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    const total = chatHistory.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    res.json({
        total,
        data: chatHistory.slice(start, end)
    });
});

app.post('/admin/kick-user', (req, res) => {
    const { userId } = req.body;
    let kicked = false;

    for (const [socketId, user] of onlineUsers.entries()) {
        if (user.id === userId) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                // 先发送被踢出的消息
                socket.emit('kicked');

                // 等待一小段时间后断开连接，确保消息能发送出去
                setTimeout(() => {
                    socket.disconnect(true);
                }, 100);

                kicked = true;

                // 发送系统消息
                const kickMessage = {
                    type: 'system',
                    content: `${user.username} 已被管理员移出聊天室`,
                    timestamp: Date.now()
                };
                chatHistory.push(kickMessage);
                io.emit('newMessage', kickMessage);
            }
            break;
        }
    }

    res.json({ success: kicked });
});

// 获取聊天记录
app.get('/admin/messages', requireAdmin, (req, res) => {
    try {
        const messages = chatHistory.map(msg => {
            // 确保系统消息和普通消息都正确处理
            const username = msg.type === 'system' ? 'system' : getShortId(msg.userId);

            return {
                id: msg.id,
                username: username,
                content: msg.content,
                time: new Date(msg.timestamp).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                })
            };
        });

        res.json({
            success: true,
            data: messages.reverse()
        });
    } catch (error) {
        console.error('获取聊天记录错误:', error);
        res.status(500).json({
            success: false,
            error: '获取聊天记录失败'
        });
    }
});

// 删除消息
app.delete('/admin/messages/:id', requireAdmin, (req, res) => {
    try {
        const messageId = req.params.id;
        const index = chatHistory.findIndex(msg => msg.id === messageId);

        if (index !== -1) {
            chatHistory.splice(index, 1);
            res.json({ success: true });
        } else {
            res.status(404).json({
                success: false,
                error: '消息不存在'
            });
        }
    } catch (error) {
        console.error('删除消息错误:', error);
        res.status(500).json({
            success: false,
            error: '删除消息失败'
        });
    }
});

// Socket.IO 事件处理
io.on('connection', (socket) => {
    // 当新用户连接时
    socket.on('setUsername', (username) => {
        socket.data.username = username;
        // 发送系统消息时使用短ID
        const shortId = getShortId(socket.id);
        io.emit('message', {
            type: 'system',
            content: `用户 ${shortId} 加入了聊天`,
            timestamp: Date.now()
        });
    });

    // 当用户断开连接时
    socket.on('disconnect', () => {
        if (socket.data.username) {
            const shortId = getShortId(socket.id);
            io.emit('message', {
                type: 'system',
                content: `用户 ${shortId} 离开了聊天`,
                timestamp: Date.now()
            });
        }
    });

    // ... 其他 socket 事件处理保持不变 ...
});

// 处理踢出用户
app.post('/admin/kickUser', requireAdmin, (req, res) => {
    const { userId } = req.body;
    const socket = io.sockets.sockets.get(userId);

    if (socket) {
        // 发送踢出消息给用户
        socket.emit('kicked', { message: '您已被管理员移出聊天室' });
        // 断开连接
        socket.disconnect(true);
        res.json({ success: true });
    } else {
        res.status(404).json({
            success: false,
            error: '用户不存在'
        });
    }
});

// 添加删除消息的路由
app.delete('/admin/messages/:id', requireAdmin, (req, res) => {
    const messageId = req.params.id;
    const index = chatHistory.findIndex(msg => msg.id === messageId);

    if (index !== -1) {
        chatHistory.splice(index, 1);
        res.json({ success: true });
    } else {
        res.status(404).json({
            success: false,
            error: '消息不存在'
        });
    }
}); 