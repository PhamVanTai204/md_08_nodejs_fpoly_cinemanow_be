const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const OTP = require('../models/otp.model');
const createResponse = require('../utils/responseHelper');
const refreshTokens = [];
class UserService {
    //Logic chức năng đăng kí
    async register(user_data){
        try {
            const { user_name, email, password, url_image, role } = userData;
            const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
            const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
            let user = await User.findOne({ $or: [{ email }, { user_name }] });
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            if (!user_name || !email || !password || role === undefined) {
                throw new Error('Vui lòng điền đầy đủ thông tin');
            }
            if (!usernameRegex.test(user_name)) {
                throw new Error('Username không hợp lệ');
            }
            if (!passwordRegex.test(password)) {
                throw new Error('Password không hợp lệ');
            }
            if (!emailRegex.test(email)) {
                throw new Error('Email phải có đuôi @gmail.com');
            }
            if (user) {
                throw new Error('Email hoặc user_name đã tồn tại');
            }
            user = new User({ 
                user_name, 
                email, 
                password: hashedPassword, 
                url_image, role 
            });
            //Lưu vào datatbase
            await user.save();
            return 'Đăng ký thành công';
        } catch (error) {
            throw new Error(`Lỗi khi đăng ký: ${error.message}`);
        }
    }

    //Logic chức năng đăng nhập
    async login(loginData) {
        try {
            const { email, password } = loginData;
            const user = await User.findOne({ email });
            const isMatch = await bcrypt.compare(password, user.password);
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);
            if (!email || !password) {
              throw new Error('Vui lòng nhập email và mật khẩu');
            }
            if (!user) {
              throw new Error('Email không tồn tại');
            }
            if (!isMatch) {
              throw new Error('Mật khẩu không đúng');
            }

            const token = jwt.sign(
            { 
                userId: user._id, 
                user_name: user.user_name, 
                role: user.role 
            },
              process.env.JWT_SECRET,
              { expiresIn: '1h' }
            );
            refreshTokens.push(refreshToken);
            return {    
                user: {
                    id: user._id,
                    user_name: user.user_name,
                    email: user.email,
                    role: user.role,
                },
                accessToken,
                refreshToken
            };
        } catch (error) {
            throw new Error(`Lỗi khi đăng nhập: ${error.message}`);
        }
       
    }

    //Logic chức năng đăng xuất
    async logout(refreshToken){
        try {
            // Xóa refresh token khỏi danh sách hợp lệ
            const index = refreshTokens.indexOf(refreshToken);
            if (index === -1) {
                throw new Error('Token không hợp lệ');
            }
            refreshTokens.splice(index, 1);
            return 'Đăng xuất thành công';
        } catch (error) {
            throw new Error(`Lỗi khi đăng xuất: ${error.message}`);
        }
    }

    //Logic chức năng refreshToken
    async refreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const user = await User.findById(decoded.userId);
            const newAccessToken = this.generateAccessToken(user);
            if (!refreshToken || !refreshTokens.includes(refreshToken)) {
                throw new Error('Refresh token không hợp lệ');
            }
            if (!user) {
                throw new Error('Người dùng không tồn tại');
            }
            return { accessToken: newAccessToken };
        } catch (error) {
            throw new Error(`Lỗi khi làm mới token: ${error.message}`);
        }
    }

    generateAccessToken(user) {
        return jwt.sign(
            { 
                userId: user._id, 
                user_name: user.user_name, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    }

    generateRefreshToken(user) {
        return jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );
    }
}