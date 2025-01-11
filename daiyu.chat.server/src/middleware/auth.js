const jwt = require('jsonwebtoken');
const config = require('../config/config.json');

const authenticateAdmin = (req, res, next) => {
    const token = req.cookies.adminToken;

    if (!token) {
        return res.status(401).json({ error: '未授权', redirect: '/admin/login' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.admin = decoded;
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        res.status(401).json({ error: '无效的令牌', redirect: '/admin/login' });
    }
};

module.exports = { authenticateAdmin }; 