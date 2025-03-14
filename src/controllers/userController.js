const UserService = require('../services/userService');

class UserController {
    // Đăng ký
    async register(req, res) {
        try {
            const message = await UserService.register(req.body);
            res.status(201).json({ message });
        } catch (error) {
          if (error.name === "ValidationError") {
            return res.status(200).json({ code: 400, error: error.message, data: null });
        }

        if (error.code === 11000) { // Lỗi trùng key trong MongoDB
            return res.status(200).json({ code: 409, error: "Tài khoản đã tồn tại.", data: null });
        }

        if (error.name === "UnauthorizedError") {
            return res.status(200).json({ code: 401, error: "Bạn không có quyền thực hiện hành động này.", data: null });
        }

        if (error.name === "ForbiddenError") {
            return res.status(403).json({ code: 403, error: "Truy cập bị từ chối.", data: null });
        }

        if (error.name === "NotFoundError") {
            return res.status(200).json({ code: 404, error: "Không tìm thấy tài nguyên yêu cầu.", data: null });
        }

        if (error.name === "DatabaseError") {
            return res.status(500).json({ code: 500, error: "Lỗi kết nối cơ sở dữ liệu.", data: null });
        }
            res.status(500).json({ error: error.message });
        }
    }

    // Đăng nhập
    async login(req, res) {
        try {
            const data = await UserService.login(req.body);
            res.status(200).json(data);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Đăng xuất
    async logout(req, res) {
        try {
            const message = await UserService.logout(req.body.refreshToken);
            res.status(200).json({ message });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Refresh Token
    async refreshToken(req, res) {
        try {
            const data = await UserService.refreshToken(req.body.refreshToken);
            res.status(200).json(data);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Quên mật khẩu
    async forgotPassword(req, res) {
        try {
            const message = await UserService.forgotPassword(req.body.email);
            res.status(200).json({ message });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Xác nhận OTP
    async confirmOTP(req, res) {
        try {
            const message = await UserService.confirmOTP(req.body.email, req.body.otp);
            res.status(200).json({ message });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Đặt lại mật khẩu
    async resetPassword(req, res) {
        try {
            const message = await UserService.resetPassword(req.body.email, req.body.otp, req.body.newPassword);
            res.status(200).json({ message });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Lấy danh sách tất cả user
    async getAllUsers(req, res) {
        try {
            const users = await UserService.getAllUsers();
            res.status(200).json(users);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    // Lấy thông tin user theo ID
    async getUserById(req, res) {
        try {
            const user = await UserService.getUserById(req.params.id);
            res.status(200).json(user);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new UserController();
