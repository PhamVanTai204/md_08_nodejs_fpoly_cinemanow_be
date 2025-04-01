const createResponse = require('../utils/response');

// Kiểm tra quyền admin (role 2)
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 2) {
        next();
    } else {
        res.status(403).json(createResponse(403, 'Bạn không có quyền admin', null));
    }
};

// Kiểm tra quyền nhân viên (role 3)
exports.isStaff = (req, res, next) => {
    if (req.user && req.user.role === 3) {
        next();
    } else {
        res.status(403).json(createResponse(403, 'Bạn không có quyền nhân viên', null));
    }
};

// Kiểm tra quyền thành viên (role 1)
exports.isMember = (req, res, next) => {
    if (req.user && req.user.role === 1) {
        next();
    } else {
        res.status(403).json(createResponse(403, 'Bạn không phải là thành viên', null));
    }
};

// Kiểm tra quyền khách vãng lai (role 0)
exports.isGuest = (req, res, next) => {
    if (req.user && req.user.role === 0) {
        next();
    } else {
        res.status(403).json(createResponse(403, 'Bạn không phải là khách vãng lai', null));
    }
};

// Kiểm tra quyền admin hoặc nhân viên (role 2 hoặc 3)
exports.isAdminOrStaff = (req, res, next) => {
    if (req.user && (req.user.role === 2 || req.user.role === 3)) {
        next();
    } else {
        res.status(403).json(createResponse(403, 'Bạn không có quyền admin hoặc nhân viên', null));
    }
};

// Kiểm tra quyền thành viên trở lên (role 1, 2, 3)
exports.isMemberOrAbove = (req, res, next) => {
    if (req.user && req.user.role >= 1) {
        next();
    } else {
        res.status(403).json(createResponse(403, 'Bạn cần đăng nhập với tài khoản thành viên', null));
    }
};

// Kiểm tra quyền đã đăng nhập (tất cả role)
exports.isAuthenticated = (req, res, next) => {
    if (req.user && req.user.role >= 0) {
        next();
    } else {
        res.status(401).json(createResponse(401, 'Bạn cần đăng nhập để thực hiện thao tác này', null));
    }
}; 