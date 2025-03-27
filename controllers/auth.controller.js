const jwt = require('jsonwebtoken');
const createResponse = require('../utils/responseHelper');
const User = require('../models/user');

// Đăng nhập
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kiểm tra user tồn tại
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json(createResponse(401, 'Email hoặc mật khẩu không đúng', null));
        }

        // Kiểm tra password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json(createResponse(401, 'Email hoặc mật khẩu không đúng', null));
        }

        // Tạo access token
        const accessToken = jwt.sign(
            { 
                id: user._id,
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Tạo refresh token
        const refreshToken = jwt.sign(
            { 
                id: user._id,
                email: user.email,
                role: user.role 
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json(createResponse(200, null, {
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        }));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi đăng nhập', error.message));
    }
};

// Refresh token
exports.refreshToken = async (req, res) => {
    try {
        const user = req.user;

        // Tạo access token mới
        const accessToken = jwt.sign(
            { 
                id: user.id,
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json(createResponse(200, null, {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        }));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi tạo token mới', error.message));
    }
}; 