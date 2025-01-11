const jwt = require('jsonwebtoken');
const config = require('../config/config.json');

const login = (req, res) => {
    const { password } = req.body;

    console.log('Login attempt with password:', password);
    console.log('Expected password:', config.adminPassword);

    if (password === config.adminPassword) {
        const token = jwt.sign({ admin: true }, config.jwtSecret, {
            expiresIn: '7d'
        });

        res.cookie('adminToken', token, {
            maxAge: config.cookieMaxAge,
            httpOnly: true,
            secure: false, // 本地开发时设为 false
            sameSite: 'lax'
        });

        console.log('Login successful, token generated');
        res.json({ success: true });
    } else {
        console.log('Login failed: incorrect password');
        res.status(401).json({ error: '密码错误' });
    }
};

module.exports = { login }; 