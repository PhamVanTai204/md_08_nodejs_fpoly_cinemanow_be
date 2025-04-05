// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const createResponse = require('../utils/responseHelper');

// Middleware xác thực token
const auth = async (req, res, next) => {
  try {
    // Lấy token từ header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json(createResponse(401, 'Không tìm thấy token xác thực', null));
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Tìm user với ID từ token đã giải mã và kiểm tra xem token có trong danh sách tokens không
    const user = await User.findOne({ 
      _id: decoded.userId,
      tokens: token
    });

    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    // Thêm thông tin user và token vào request để sử dụng trong các middleware tiếp theo
    req.token = token;
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json(createResponse(401, 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', null));
  }
};

module.exports = auth;