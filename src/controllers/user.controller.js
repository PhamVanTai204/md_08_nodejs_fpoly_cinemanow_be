const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const OTP = require('../models/otp.model'); // Import model OTP
const createResponse = require('../utils/responseHelper');

exports.reg = async (req, res) => {
  const { user_name, email, password, url_image, role } = req.body;

  if (!user_name) return res.status(400).json(createResponse(400, 'Vui lòng nhập tên người dùng', null));
  if (!email) return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  if (!password) return res.status(400).json(createResponse(400, 'Vui lòng nhập mật khẩu', null));
  if (!url_image) return res.status(400).json(createResponse(400, 'Vui lòng cung cấp ảnh đại diện (url_image)', null));
  if (role === undefined || role === null || isNaN(role)) {
    return res.status(400).json(createResponse(400, 'Vui lòng chọn vai trò người dùng (role)', null));
  }

  const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  if (!usernameRegex.test(user_name)) return res.status(400).json(createResponse(400, 'Username không hợp lệ', null));
  if (!passwordRegex.test(password)) return res.status(400).json(createResponse(400, 'Password không hợp lệ', null));
  if (!emailRegex.test(email)) return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));

  try {
    const user = await User.findOne({ $or: [{ email }, { user_name }] });
    if (user) return res.status(409).json(createResponse(409, 'Email hoặc username đã tồn tại', null));

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const newUser = new User({ user_name, email, password: hashedPassword, url_image, role });
    await newUser.save();

    return res.status(201).json(createResponse(201, null, 'Đăng ký thành công'));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email) return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email))
    return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));
  if (!password) return res.status(400).json(createResponse(400, 'Vui lòng nhập mật khẩu', null));

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json(createResponse(404, 'Email không tồn tại', null));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json(createResponse(401, 'Mật khẩu không chính xác', null));

    const token = jwt.sign(
      {
        userId: user._id,
        user_name: user.user_name,
        role: user.role,
        url_image: user.url_image,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json(createResponse(200, null, {
      userId: user._id,
      user_name: user.user_name,
      email: user.email,
      role: user.role,
      url_image: user.url_image,
      token
    }));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json(createResponse(404, 'Email chưa đăng ký tài khoản', null));
    }

    const lastOTP = await OTP.findOne({ email }).sort({ createdAt: -1 });
    const timeDiff = lastOTP ? (Date.now() - lastOTP.createdAt.getTime()) / 1000 : 999;

    if (timeDiff < 60) {
      return res.status(400).json(createResponse(400, `OTP đã được gửi, vui lòng thử lại sau ${Math.ceil(60 - timeDiff)} giây`, null));
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    await OTP.create({ email, otp });

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'sanndph32936@fpt.edu.vn',
        pass: 'tlqb wbgl llzt mbnw',
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: 'sanndph32936@fpt.edu.vn',
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px;">
          <h2 style="text-align: center; color: #3bcdba;">Mã OTP đặt lại mật khẩu</h2>
          <p>Xin chào <b>${user.user_name}</b>,</p>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu. Mã OTP của bạn là:</p>
          <div style="font-size: 32px; font-weight: bold; background: #eee; padding: 10px; text-align: center; border-radius: 6px;">${otp}</div>
          <p>Mã OTP có hiệu lực trong 5 phút.</p>
          <p style="color: red;">Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
        </div>
      `
    });

    return res.status(200).json(createResponse(200, null, 'OTP đã được gửi vào email của bạn'));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server khi gửi OTP', error.message));
  }
};


// Xác nhận OTP
exports.confirmOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json(createResponse(400, 'OTP không hợp lệ hoặc đã hết hạn', null));
    }


    res.json(createResponse(200, null, 'OTP hợp lệ'));
  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};




// Đổi mật khẩu
exports.resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  // Kiểm tra xem có đầy đủ thông tin không
  if (!email || !otp || !password) {
    return res.status(400).json(createResponse(400, 'Vui lòng nhập đầy đủ thông tin (email, otp, password)', null));
  }

  // Kiểm tra định dạng mật khẩu mới (ít nhất 6 ký tự, có chữ và số)
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json(createResponse(400, 'Mật khẩu mới phải có ít nhất 6 ký tự, bao gồm chữ và số', null));
  }

  try {
    // Kiểm tra xem email có tồn tại không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json(createResponse(404, 'Email không tồn tại', null));
    }

    // Kiểm tra OTP có hợp lệ không
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json(createResponse(400, 'OTP không hợp lệ hoặc đã hết hạn', null));
    }


    // Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Cập nhật mật khẩu mới cho user
    await User.updateOne({ email }, { $set: { password: hashedPassword } });

    res.json(createResponse(200, null, 'Đổi mật khẩu thành công'));
    // Xóa OTP sau khi sử dụng
    await OTP.deleteOne({ _id: otpRecord._id });

  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

// Lấy danh sách tất cả user
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // Lấy tất cả user, ẩn password
    res.json(createResponse(200, null, users));
  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

// Lấy user theo ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id, '-password'); // Tìm user theo ID, ẩn password
    if (!user) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy user', null));
    }
    res.json(createResponse(200, null, user));
  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query;

    // Kiểm tra role có hợp lệ không (chỉ chấp nhận 1 hoặc 2)
    if (role !== "1" && role !== "2") {
      return res.status(400).json(createResponse(400, 'Role không hợp lệ, chỉ chấp nhận 1 hoặc 2', null));
    }

    // Tìm user theo role và ẩn password
    const users = await User.find({ role: Number(role) }, '-password');

    return res.json(createResponse(200, null, users));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

// Lấy thông tin user theo email
exports.getUserByEmail = async (req, res) => {
    try {
        const email = req.params.email;

        // Kiểm tra email có được cung cấp không
        if (!email) {
            return res.status(400).json({
                status: false,
                message: 'Vui lòng cung cấp email',
                data: null
            });
        }

        // Tìm user theo email
        const user = await User.findOne({ email });

        // Kiểm tra user có tồn tại không
        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'Không tìm thấy người dùng với email này',
                data: null
            });
        }

        // Format lại thông tin user trước khi trả về
        const userInfo = {
            _id: user._id,
            user_name: user.user_name,
            email: user.email,
            full_name: user.full_name || '',
            phone_number: user.phone_number || '',
            url_image: user.url_image,
            date_of_birth: user.date_of_birth || '',
            gender: user.gender || '',
            role: user.role
        };

        // Trả về thông tin user
        res.status(200).json({
            status: true,
            message: 'Lấy thông tin người dùng thành công',
            data: userInfo
        });

    } catch (error) {
        console.error('Get user by email error:', error);
        res.status(500).json({
            status: false,
            message: 'Lỗi khi lấy thông tin người dùng',
            data: null
        });
    }
};

// Refresh token
exports.refreshToken = async (req, res) => {
    try {
        const oldToken = req.params.token;
        
        if (!oldToken) {
            return res.status(401).json({
                status: false,
                message: 'Token không được cung cấp',
                data: null
            });
        }

        // Xác thực token cũ
        jwt.verify(oldToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    status: false,
                    message: 'Token không hợp lệ hoặc đã hết hạn',
                    data: null
                });
            }

            try {
                // Lấy thông tin user từ decoded token
                const user = await User.findById(decoded.userId);
                
                if (!user) {
                    return res.status(404).json({
                        status: false,
                        message: 'Không tìm thấy người dùng',
                        data: null
                    });
                }

                // Tạo token mới
                const newToken = jwt.sign(
                    { 
                        userId: user._id, 
                        email: user.email,
                        avatar: user.avatar,
                        user_name: user.user_name, 
                        role: user.role 
                    }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '1h' }
                );

                // Trả về token mới
                res.json({
                    status: true,
                    message: 'Refresh token thành công',
                    data: {
                        userId: user._id,
                        user_name: user.user_name,
                        email: user.email,
                        role: user.role,
                        token: newToken
                    }
                });

            } catch (error) {
                console.error('Refresh token error:', error);
                res.status(500).json({
                    status: false,
                    message: 'Lỗi server khi refresh token',
                    data: null
                });
            }
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            status: false,
            message: 'Lỗi server',
            data: null
        });
    }
};
