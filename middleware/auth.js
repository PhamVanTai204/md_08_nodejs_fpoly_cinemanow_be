const jwt = require('jsonwebtoken');
const createResponse = require('../utils/responseHelper');

const verifyToken = (req, res, next) => {
    try {
        // Lấy token từ header Authorization
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(403).json(createResponse(403, 'Không tìm thấy token xác thực', null));
        }

        // Kiểm tra format "Bearer token"
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(403).json(createResponse(403, 'Token không đúng định dạng', null));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json(createResponse(401, 'Token không hợp lệ', null));
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(createResponse(401, 'Token đã hết hạn', null));
        }
        return res.status(401).json(createResponse(401, 'Token không hợp lệ hoặc đã hết hạn', null));
    }
};

const verifyRefreshToken = (req, res, next) => {
    try {
        const refreshToken = req.body.refreshToken;
        if (!refreshToken) {
            return res.status(403).json(createResponse(403, 'Không tìm thấy refresh token', null));
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json(createResponse(401, 'Refresh token không hợp lệ', null));
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(createResponse(401, 'Refresh token đã hết hạn', null));
        }
        return res.status(401).json(createResponse(401, 'Refresh token không hợp lệ hoặc đã hết hạn', null));
    }
};

module.exports = { verifyToken, verifyRefreshToken }; 