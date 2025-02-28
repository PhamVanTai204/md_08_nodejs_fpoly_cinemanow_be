const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const OTP = require('../models/otp.model'); // Import model OTP


const createResponse = (code, error, data) => ({ code, error, data });

// Đăng ký
exports.reg = async (req, res) => {
  const { username, email, password, phone_number, full_name, date_of_birth, gender, role } = req.body;

  if (!username || !email || !password || !phone_number || !full_name || !date_of_birth || gender === undefined || role === undefined) {
    return res.status(400).json(createResponse(400, 'Vui lòng điền đầy đủ thông tin', null));
  }

  const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json(createResponse(400, 'Username không hợp lệ', null));
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json(createResponse(400, 'Password không hợp lệ', null));
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json(createResponse(400, 'Email phải có đuôi @gmail.com', null));
  }


  const phoneRegex = /^\d{9,11}$/;
  if (!phoneRegex.test(phone_number)) {
    return res.status(400).json(createResponse(400, 'Số điện thoại không hợp lệ', null));
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date_of_birth)) {
    return res.status(400).json(createResponse(400, 'Ngày sinh không hợp lệ', null));
  }

  const dob = new Date(date_of_birth);
  const today = new Date();
  if (isNaN(dob.getTime())) {
    return res.status(400).json(createResponse(400, 'Ngày sinh không hợp lệ', null));
  }
  if (dob > today) {
    return res.status(400).json(createResponse(400, 'Ngày sinh không thể là ngày trong tương lai', null));
  }
  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(409).json(createResponse(409, 'Email hoặc username đã tồn tại', null));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ username, email, password: hashedPassword, phone_number, full_name, date_of_birth: dob, gender, role });
    await user.save();

    res.status(201).json(createResponse(201, null, 'Đăng ký thành công'));
  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ code: 400, error: 'Vui lòng nhập email và mật khẩu' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ code: 404, error: 'Email không tồn tại' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ code: 401, error: 'Mật khẩu không đúng' });
    }

    const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({
      code: 200,
      error: null,
      data: {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token: token,
    });
  } catch (error) {
    res.status(500).json({ code: 500, error: 'Lỗi server', message: error.message });
  }
};

// Cấu hình Nodemailer


exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const otp = Math.floor(100000 + Math.random() * 900000); // Tạo mã OTP 6 chữ số

    // Kiểm tra user có tồn tại không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json(createResponse(404, 'Email chưa đăng ký tài khoản', null));
    }
    const existingOTP = await OTP.findOne({ email });
    if (existingOTP) {
      return res.status(400).json(createResponse(400, 'OTP vẫn còn hiệu lực, vui lòng thử lại sau', null));
    }

    // Lưu OTP vào collection riêng (MongoDB sẽ tự động xóa sau 5 phút)
    await OTP.create({ email, otp });

    // Gửi email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'sanndph32936@fpt.edu.vn',
        pass: 'tlqb wbgl llzt mbnw',
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: 'sanndph32936@fpt.edu.vn',
      to: email,
      subject: 'Password Reset OTP',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9f9f9;">
        <div style="text-align: center; padding: 20px; background-color:rgb(59, 205, 186); border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 26px; color: #ffffff;">Yêu Cầu Đặt Lại Mật Khẩu</h1>
        </div>
        <div style="padding: 20px; text-align: center;">
          <p style="font-size: 16px; color:rgb(0, 0, 0); line-height: 1.6;">
            Bạn đã yêu cầu đặt lại mật khẩu.  
          </p>
            <p style="font-size: 16px; color:rgb(0, 0, 0); line-height: 1.6;">
            Vui lòng sử dụng mã OTP bên dưới để xác thực:
          </p>
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; display: inline-block; margin: 20px 0;">
            <p style="font-size: 36px; font-weight: bold; color:rgb(0, 0, 0); margin: 0;">${otp}</p>
          </div>
          <p style="font-size: 14px; color:rgb(255, 0, 0);">
            Mã OTP có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; background-color: #f1f1f1; border-radius: 0 0 12px 12px; border: 1px solidrgb(6, 6, 6);">
          <p style="font-size: 14px; color:rgb(0, 0, 0); margin: 0; ">
            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
          </p>
        </div>
      </div>
    `,
    };

    await transporter.sendMail(mailOptions);

    res.json(createResponse(200, null, 'Kiểm tra mã OTP được gửi vào Email của bạn'));

  } catch (error) {
    res.status(500).json({ msg: 'Lỗi server: ' + error });
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

    // Nếu tìm thấy OTP, MongoDB sẽ tự động xóa khi hết hạn, không cần xóa thủ công
    await OTP.deleteOne({ _id: otpRecord._id });

    res.json(createResponse(200, null, 'OTP hợp lệ'));
  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};



// Đổi mật khẩu
exports.resetPassword = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json(createResponse(404, 'Email không tồn tại', null));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Chỉ cập nhật password mà không ảnh hưởng đến các field khác
    await User.updateOne({ email }, { $set: { password: hashedPassword } });

    res.json(createResponse(200, null, 'Đổi mật khẩu thành công'));
  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

