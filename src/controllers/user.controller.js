const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const OTP = require('../models/otp.model'); // Import model OTP
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');
const { getRoleName } = require('../utils/role_hepler');
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
      token,
      phone_number: user.phone_number ?? '',
      date_of_birth: user.date_of_birth ?? '',
      gender: user.gender !== undefined ? Number(user.gender) : null
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

exports.confirmOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email) {
    return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  }

  if (!otp) {
    return res.status(400).json(createResponse(400, 'Vui lòng nhập mã OTP', null));
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));
  }

  try {
    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json(createResponse(400, 'OTP không hợp lệ hoặc đã hết hạn', null));
    }

    return res.status(200).json(createResponse(200, null, 'OTP hợp lệ'));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server khi xác thực OTP', error.message));
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email) return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  if (!otp) return res.status(400).json(createResponse(400, 'Vui lòng nhập mã OTP', null));
  if (!password) return res.status(400).json(createResponse(400, 'Vui lòng nhập mật khẩu mới', null));

  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json(createResponse(400, 'Mật khẩu phải có ít nhất 6 ký tự và bao gồm chữ và số', null));
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json(createResponse(404, 'Email không tồn tại', null));

    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json(createResponse(400, 'OTP không hợp lệ hoặc đã hết hạn', null));
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    await User.updateOne({ email }, { $set: { password: hashedPassword } });

    await OTP.deleteOne({ _id: otpRecord._id }); // Xóa OTP sau khi dùng

    return res.status(200).json(createResponse(200, null, 'Đổi mật khẩu thành công'));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server khi đặt lại mật khẩu', error.message));
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // Ẩn password

    if (!users || users.length === 0) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng nào', null));
    }

    return res.status(200).json(createResponse(200, null, users));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server khi lấy danh sách người dùng', error.message));
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
  }

  try {
    const user = await User.findById(id, '-password');
    if (!user) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
    }

    res.status(200).json(createResponse(200, null, user));
  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server khi lấy người dùng', error.message));
  }
};

exports.getUsersByRole = async (req, res) => {
  const { role } = req.params;
  const allowedRoles = [1, 2, 3];

  const roleNum = parseInt(role);
  if (!allowedRoles.includes(roleNum)) {
    return res.status(400).json(createResponse(
      400,
      'Role không hợp lệ. Chỉ chấp nhận 1 (Thành viên), 2 (Admin), 3 (Nhân viên)',
      null
    ));
  }

  try {
    const users = await User.find({ role: roleNum }, '-password');

    const result = users.map(u => ({
      ...u.toObject(),
      role_name: getRoleName(u.role)
    }));

    res.json(createResponse(200, null, result));
  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

exports.getUserByEmail = async (req, res) => {
  const { email } = req.params;

  if (!email || email.trim() === '') {
    return res.status(400).json(createResponse(400, 'Vui lòng nhập từ khóa email để tìm kiếm', null));
  }

  try {
    const users = await User.find(
      { email: { $regex: email, $options: 'i' } },
      '-password'
    );

    if (!users || users.length === 0) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng nào với email chứa từ khóa này', null));
    }

    return res.status(200).json(createResponse(200, null, users));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server khi tìm kiếm người dùng', error.message));
  }
};

exports.refreshToken = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(createResponse(401, 'Token không được cung cấp', null));
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json(createResponse(401, 'Token không hợp lệ hoặc đã hết hạn', null));
    }

    try {
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
      }

      const newToken = jwt.sign({
        userId: user._id,
        email: user.email,
        user_name: user.user_name,
        role: user.role,
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // ✅ Chỉ trả chuỗi thông báo thành công
      return res.status(200).json(createResponse(200, null, 'Gia hạn token thành công'));
    } catch (error) {
      return res.status(500).json(createResponse(500, 'Lỗi server khi refresh token', error.message));
    }
  });
};

exports.updateProfile = async (req, res) => {
  const { userId } = req.params;
  const {
    user_name,
    email,
    full_name,
    phone_number,
    date_of_birth,
    gender,
    url_image, // ✅ thêm url_image vào destructured body
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(404).json(createResponse(404, 'ID người dùng không hợp lệ', null));
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
    }

    if (
      user_name === undefined &&
      email === undefined &&
      full_name === undefined &&
      phone_number === undefined &&
      date_of_birth === undefined &&
      gender === undefined &&
      url_image === undefined // ✅ thêm kiểm tra url_image
    ) {
      return res.status(200).json(createResponse(200, null, 'Không có trường nào được cập nhật'));
    }

    // ✅ Cập nhật các trường nếu có
    if (user_name !== undefined) user.user_name = user_name;
    if (email !== undefined) user.email = email;
    if (full_name !== undefined) user.full_name = full_name;
    if (phone_number !== undefined) user.phone_number = phone_number;

    if (date_of_birth !== undefined) {
      const date = new Date(date_of_birth);
      if (isNaN(date.getTime())) {
        return res.status(400).json(createResponse(400, 'Ngày sinh không hợp lệ', null));
      }
      user.date_of_birth = date;
    }

    if (gender !== undefined) user.gender = gender;
    if (url_image !== undefined) user.url_image = url_image; // ✅ Cập nhật ảnh đại diện mới

    await user.save();

    return res.status(200).json(createResponse(200, null, 'Cập nhật thông tin thành công'));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi khi cập nhật thông tin', error.message));
  }
};




// Thêm vào file controller người dùng (nơi chứa các hàm login, reg, ...)

// Đăng xuất
exports.logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json(createResponse(400, 'Token không tồn tại', null));
    }

    // Lấy user từ middleware xác thực (giả sử req.user đã được set bởi middleware auth)
    const userId = req.user.userId;

    // Tìm user và xóa token hiện tại khỏi mảng tokens
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
    }

    // Xóa token hiện tại khỏi mảng tokens
    user.tokens = user.tokens.filter(t => t !== token);
    await user.save();

    res.json(createResponse(200, null, 'Đăng xuất thành công'));
  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

// Đăng xuất tất cả thiết bị
exports.logoutAll = async (req, res) => {
  try {
    // Lấy user từ middleware xác thực
    const userId = req.user.userId;

    // Tìm user và xóa tất cả token
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
    }

    // Xóa tất cả token
    user.tokens = [];
    await user.save();

    res.json(createResponse(200, null, 'Đăng xuất khỏi tất cả thiết bị thành công'));
  } catch (error) {
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

