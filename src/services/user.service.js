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

    // Logic chức năng quên mật khẩu
    async forgotPassword(email) {
        try {
            // Tạo mã OTP 6 chữ số
            const otp = Math.floor(100000 + Math.random() * 900000); 
            const user = await User.findOne({ email });
            const lastOTP = await OTP.findOne({ email }).sort({ createdAt: -1 });

            if (!user) {
                throw new Error('Email chưa đăng ký tài khoản');
            }
            if (lastOTP) {
                const timeDiff = (Date.now() - lastOTP.createdAt.getTime()) / 1000; 
                if (timeDiff < 120) {
                    throw new Error(`OTP đã được gửi, vui lòng thử lại sau ${Math.ceil(120 - timeDiff)} giây`);
                }
            }
            await OTP.create({ email, otp });

            const transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
                tls: { rejectUnauthorized: false }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Password Reset OTP',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9;">
                    <div style="text-align: center; padding: 20px; background-color:rgb(59, 205, 186); border-radius: 12px 12px 0 0;">
                        <h1 style="margin: 0; font-size: 26px; color: #ffffff;">Yêu Cầu Đặt Lại Mật Khẩu</h1>
                    </div>
                    <div style="padding: 20px; text-align: center;">
                        <p style="font-size: 16px; color:rgb(0, 0, 0); line-height: 1.6;">
                            Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP bên dưới để xác thực:
                        </p>
                        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; display: inline-block; margin: 20px 0;">
                            <p style="font-size: 36px; font-weight: bold; color:rgb(0, 0, 0); margin: 0;">${otp}</p>
                        </div>
                        <p style="font-size: 14px; color:rgb(255, 0, 0);">
                            Mã OTP có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.
                        </p>
                    </div>
                    <div style="text-align: center; padding: 20px; background-color: #f1f1f1; border-radius: 0 0 12px 12px; border: 1px solid rgb(6, 6, 6);">
                        <p style="font-size: 14px; color:rgb(0, 0, 0); margin: 0;">
                            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                        </p>
                    </div>
                </div>
                `,
            };

            await transporter.sendMail(mailOptions);
            return 'OTP đã được gửi vào email của bạn';
        } catch (error) {
            throw new Error(`Lỗi khi gửi OTP: ${error.message}`);
        }
    }

    // Logic chức năng xác nhận otp
    async confirmOTP(email, otp) {
        try {
            const otpRecord = await OTP.findOne({ email, otp });

            if (!otpRecord) {
                throw new Error('OTP không hợp lệ hoặc đã hết hạn');
            }

            return 'OTP hợp lệ';
        } catch (error) {
            throw new Error(`Lỗi khi xác nhận OTP: ${error.message}`);
        }
    }

    // Logic chức năng đổi mật khẩu
    async resetPassword(email, otp, newPassword) {
        try {
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
            const user = await User.findOne({ email });
            const otpRecord = await OTP.findOne({ email, otp });
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            if (!email || !otp || !newPassword) {
                throw new Error('Vui lòng nhập đầy đủ thông tin (email, otp, password)');
            }
            if (!passwordRegex.test(newPassword)) {
                throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự, bao gồm chữ và số');
            }
            if (!user) {
                throw new Error('Email không tồn tại');
            }
            if (!otpRecord) {
                throw new Error('OTP không hợp lệ hoặc đã hết hạn');
            }
            await User.updateOne({ email }, { $set: { password: hashedPassword } });
            await OTP.deleteOne({ _id: otpRecord._id });
            return 'Đổi mật khẩu thành công';
        } catch (error) {
            throw new Error(`Lỗi khi đổi mật khẩu: ${error.message}`);
        }
    }
}