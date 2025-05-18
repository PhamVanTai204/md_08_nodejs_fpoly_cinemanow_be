// SECTION: Controller quản lý người dùng
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const OTP = require('../models/otp.model'); // Import model OTP
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');
const { getRoleName } = require('../utils/role_hepler');
const Cinema = require('../models/cinema'); // Đảm bảo đã import model Cinema
// ANCHOR: Lấy danh sách người dùng theo role và cinema_id
exports.getUsersByRoleAndCinema = async (req, res) => {
  const { role, cinema_id } = req.query;

  // VALIDATION: Kiểm tra role và cinema_id
  if (role === undefined || isNaN(role)) {
    return res.status(400).json(createResponse(400, 'Role không hợp lệ', null));
  }

  if (!cinema_id || !mongoose.Types.ObjectId.isValid(cinema_id)) {
    return res.status(400).json(createResponse(400, 'cinema_id không hợp lệ', null));
  }

  try {
    const users = await User.find({
      role: Number(role),
      cinema_id: cinema_id
    }).select('-password -__v'); // Không trả về password và __v

    return res.status(200).json(createResponse(200, null, users));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server khi lấy danh sách người dùng', error.message));
  }
};

// ANCHOR: Xóa người dùng theo ID
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  // IMPORTANT: Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
  }

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng để xóa', null));
    }

    return res.status(200).json(createResponse(200, null, 'Xóa người dùng thành công'));
  } catch (error) {
    // ERROR: Ghi log lỗi khi xóa người dùng
    return res.status(500).json(createResponse(500, 'Lỗi server khi xóa người dùng', error.message));
  }
};

// ANCHOR: Đăng ký tài khoản mới
exports.reg = async (req, res) => {
  const { user_name, email, password, url_image, role } = req.body;

  // IMPORTANT: Kiểm tra đầy đủ thông tin
  if (!user_name) return res.status(400).json(createResponse(400, 'Vui lòng nhập tên người dùng', null));
  if (!email) return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  if (!password) return res.status(400).json(createResponse(400, 'Vui lòng nhập mật khẩu', null));
  if (!url_image) return res.status(400).json(createResponse(400, 'Vui lòng cung cấp ảnh đại diện (url_image)', null));
  if (role === undefined || role === null || isNaN(role)) {
    return res.status(400).json(createResponse(400, 'Vui lòng chọn vai trò người dùng (role)', null));
  }

  // NOTE: Kiểm tra định dạng dữ liệu
  const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  // WARNING: Xác thực định dạng dữ liệu
  if (!usernameRegex.test(user_name)) return res.status(400).json(createResponse(400, 'Username không hợp lệ', null));
  if (!passwordRegex.test(password)) return res.status(400).json(createResponse(400, 'Password không hợp lệ', null));
  if (!emailRegex.test(email)) return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));

  try {
    // IMPORTANT: Kiểm tra email hoặc username đã tồn tại chưa
    const user = await User.findOne({ $or: [{ email }, { user_name }] });
    if (user) return res.status(409).json(createResponse(409, 'Email hoặc username đã tồn tại', null));

    // NOTE: Mã hóa mật khẩu trước khi lưu vào database
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const newUser = new User({ user_name, email, password: hashedPassword, url_image, role });
    await newUser.save();

    return res.status(201).json(createResponse(201, null, 'Đăng ký thành công'));
  } catch (error) {
    // ERROR: Ghi log lỗi khi đăng ký
    return res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

// ANCHOR: Đăng nhập
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // IMPORTANT: Kiểm tra đầy đủ thông tin
  if (!email) return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email))
    return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));
  if (!password) return res.status(400).json(createResponse(400, 'Vui lòng nhập mật khẩu', null));

  try {
    // NOTE: Tìm kiếm người dùng theo email
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json(createResponse(404, 'Email không tồn tại', null));

    // IMPORTANT: Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json(createResponse(401, 'Mật khẩu không chính xác', null));

    // NOTE: Tạo JWT token
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

    // NOTE: Trả về thông tin người dùng và token
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
    // ERROR: Ghi log lỗi khi đăng nhập
    return res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

// ANCHOR: Đăng nhập trang web với địa chỉ rạp
exports.loginWebByLocation = async (req, res) => {
  const { email, password, location } = req.body;

  // VALIDATION: Kiểm tra đầy đủ thông tin
  if (!email) return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email))
    return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));
  if (!password) return res.status(400).json(createResponse(400, 'Vui lòng nhập mật khẩu', null));
  if (!location) return res.status(400).json(createResponse(400, 'Vui lòng chọn tên rạp', null));

  try {
    // STEP 1: Tìm rạp theo tên (cinema_name)
    const cinema = await Cinema.findOne({ cinema_name: location });
    if (!cinema) {
      return res.status(404).json(createResponse(404, 'Tên rạp không tồn tại trong hệ thống', null));
    }

    // STEP 2: Tìm người dùng
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json(createResponse(404, 'Email không tồn tại', null));
    if (!user.cinema_id || user.cinema_id.toString() !== cinema._id.toString()) {
      return res.status(403).json(createResponse(403, 'Tài khoản không thuộc rạp này', null));
    }
    // STEP 3: Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json(createResponse(401, 'Mật khẩu không chính xác', null));

    // STEP 4: Tạo JWT token
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

    // STEP 5: Trả về thông tin người dùng kèm thông tin rạp
    return res.status(200).json(createResponse(200, null, {
      userId: user._id,
      user_name: user.user_name,
      email: user.email,
      role: user.role,
      url_image: user.url_image,
      token,
      phone_number: user.phone_number ?? '',
      date_of_birth: user.date_of_birth ?? '',
      gender: user.gender !== undefined ? Number(user.gender) : null,
      cinema_id: cinema._id,
      cinema_name: cinema.cinema_name,
      location: cinema.location,
    }));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server khi đăng nhập', error.message));
  }
};


// ANCHOR: Đăng ký tài khoản mới theo tên rạp (location)
exports.registerWebByLocation = async (req, res) => {
  const { user_name, email, password, url_image, role, location } = req.body;

  // VALIDATION: Kiểm tra đầy đủ thông tin
  if (!user_name) return res.status(400).json(createResponse(400, 'Vui lòng nhập tên người dùng', null));
  if (!email) return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  if (!password) return res.status(400).json(createResponse(400, 'Vui lòng nhập mật khẩu', null));
  if (!url_image) return res.status(400).json(createResponse(400, 'Vui lòng cung cấp ảnh đại diện (url_image)', null));
  if (!location) return res.status(400).json(createResponse(400, 'Vui lòng chọn tên rạp', null));
  if (role === undefined || role === null || isNaN(role)) {
    return res.status(400).json(createResponse(400, 'Vui lòng chọn vai trò người dùng (role)', null));
  }

  // VALIDATION: Định dạng dữ liệu
  const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  if (!usernameRegex.test(user_name)) return res.status(400).json(createResponse(400, 'Username không hợp lệ', null));
  if (!passwordRegex.test(password)) return res.status(400).json(createResponse(400, 'Password không hợp lệ', null));
  if (!emailRegex.test(email)) return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));

  try {
    // STEP 1: Kiểm tra rạp có tồn tại trong database theo tên rạp
    const cinema = await Cinema.findOne({ cinema_name: location });
    if (!cinema) {
      return res.status(404).json(createResponse(404, 'Tên rạp không tồn tại trong hệ thống', null));
    }

    // STEP 2: Kiểm tra email hoặc username đã tồn tại chưa
    const user = await User.findOne({ $or: [{ email }, { user_name }] });
    if (user) return res.status(409).json(createResponse(409, 'Email hoặc username đã tồn tại', null));

    // STEP 3: Mã hóa mật khẩu và lưu
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const newUser = new User({
      user_name,
      email,
      password: hashedPassword,
      url_image,
      role,
      cinema_id: cinema._id,
      location: cinema.cinema_name,
      // Có thể gán thêm `cinema_id: cinema._id` nếu muốn ràng buộc người dùng với rạp
    });

    await newUser.save();

    return res.status(201).json(createResponse(201, null, 'Đăng ký thành công'));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server khi đăng ký', error.message));
  }
};

// ANCHOR: Quên mật khẩu - gửi OTP
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  // IMPORTANT: Kiểm tra email
  if (!email) {
    return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));
  }

  try {
    // NOTE: Kiểm tra email có tồn tại không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json(createResponse(404, 'Email chưa đăng ký tài khoản', null));
    }

    // IMPORTANT: Kiểm tra thời gian gửi OTP gần nhất
    const lastOTP = await OTP.findOne({ email }).sort({ createdAt: -1 });
    const timeDiff = lastOTP ? (Date.now() - lastOTP.createdAt.getTime()) / 1000 : 999;

    // WARNING: Giới hạn tần suất gửi OTP
    if (timeDiff < 60) {
      return res.status(400).json(createResponse(400, `OTP đã được gửi, vui lòng thử lại sau ${Math.ceil(60 - timeDiff)} giây`, null));
    }

    // NOTE: Tạo mã OTP ngẫu nhiên 6 số
    const otp = Math.floor(100000 + Math.random() * 900000);
    await OTP.create({ email, otp });

    // ANCHOR: Cấu hình nodemailer và gửi email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'sanndph32936@fpt.edu.vn',
        pass: 'tlqb wbgl llzt mbnw',
      },
      tls: { rejectUnauthorized: false },
    });

    // NOTE: Gửi email chứa OTP
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
    // ERROR: Ghi log lỗi khi gửi OTP
    return res.status(500).json(createResponse(500, 'Lỗi server khi gửi OTP', error.message));
  }
};

// ANCHOR: Xác thực mã OTP
exports.confirmOTP = async (req, res) => {
  const { email, otp } = req.body;

  // IMPORTANT: Kiểm tra đầy đủ thông tin
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
    // NOTE: Tìm OTP trùng khớp với email
    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json(createResponse(400, 'OTP không hợp lệ hoặc đã hết hạn', null));
    }

    // TODO: Kiểm tra thời gian tồn tại của OTP (5 phút)

    return res.status(200).json(createResponse(200, null, 'OTP hợp lệ'));
  } catch (error) {
    // ERROR: Ghi log lỗi khi xác thực OTP
    return res.status(500).json(createResponse(500, 'Lỗi server khi xác thực OTP', error.message));
  }
};

// ANCHOR: Đặt lại mật khẩu
exports.resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;

  // IMPORTANT: Kiểm tra đầy đủ thông tin
  if (!email) return res.status(400).json(createResponse(400, 'Vui lòng nhập email', null));
  if (!otp) return res.status(400).json(createResponse(400, 'Vui lòng nhập mã OTP', null));
  if (!password) return res.status(400).json(createResponse(400, 'Vui lòng nhập mật khẩu mới', null));

  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json(createResponse(400, 'Email phải có định dạng @gmail.com', null));
  }

  // WARNING: Kiểm tra yêu cầu về mật khẩu
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json(createResponse(400, 'Mật khẩu phải có ít nhất 6 ký tự và bao gồm chữ và số', null));
  }

  try {
    // NOTE: Kiểm tra email tồn tại
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json(createResponse(404, 'Email không tồn tại', null));

    // IMPORTANT: Kiểm tra OTP hợp lệ
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json(createResponse(400, 'OTP không hợp lệ hoặc đã hết hạn', null));
    }

    // NOTE: Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    await User.updateOne({ email }, { $set: { password: hashedPassword } });

    // IMPORTANT: Xóa OTP sau khi sử dụng
    await OTP.deleteOne({ _id: otpRecord._id });

    return res.status(200).json(createResponse(200, null, 'Đổi mật khẩu thành công'));
  } catch (error) {
    // ERROR: Ghi log lỗi khi đặt lại mật khẩu
    return res.status(500).json(createResponse(500, 'Lỗi server khi đặt lại mật khẩu', error.message));
  }
};

// ANCHOR: Lấy danh sách tất cả người dùng
exports.getAllUsers = async (req, res) => {
  try {
    // NOTE: Truy vấn tất cả người dùng, loại trừ trường password
    const users = await User.find({}, '-password');

    if (!users || users.length === 0) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng nào', null));
    }

    return res.status(200).json(createResponse(200, null, users));
  } catch (error) {
    // ERROR: Ghi log lỗi khi lấy danh sách người dùng
    return res.status(500).json(createResponse(500, 'Lỗi server khi lấy danh sách người dùng', error.message));
  }
};

// ANCHOR: Lấy thông tin người dùng theo ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  // IMPORTANT: Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
  }

  try {
    // NOTE: Tìm người dùng theo ID, loại trừ trường password
    const user = await User.findById(id, '-password');
    if (!user) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
    }

    res.status(200).json(createResponse(200, null, user));
  } catch (error) {
    // ERROR: Ghi log lỗi khi lấy thông tin người dùng
    res.status(500).json(createResponse(500, 'Lỗi server khi lấy người dùng', error.message));
  }
};

// ANCHOR: Lấy danh sách người dùng theo vai trò
exports.getUsersByRole = async (req, res) => {
  let { page, limit } = req.query;
  const { role } = req.params;
  const allowedRoles = [1, 2, 3];

  // IMPORTANT: Kiểm tra vai trò hợp lệ
  const roleNum = parseInt(role);
  if (!allowedRoles.includes(roleNum)) {
    return res.status(400).json(createResponse(
      400,
      'Role không hợp lệ. Chỉ chấp nhận 1 (Thành viên), 2 (Admin), 3 (Nhân viên)',
      null
    ));
  }

  // NOTE: Xử lý phân trang
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const skip = (page - 1) * limit;

  try {
    // NOTE: Lấy danh sách user có role cụ thể, áp dụng phân trang
    const users = await User.find({ role: roleNum }, '-password')
      .skip(skip)
      .limit(limit);

    // Đếm tổng số user có role tương ứng
    const totalUsers = await User.countDocuments({ role: roleNum });
    const totalPages = Math.ceil(totalUsers / limit);

    // IMPORTANT: Thêm role_name cho từng user
    const result = users.map(u => ({
      ...u.toObject(),
      role_name: getRoleName(u.role)
    }));

    res.status(200).json(createResponse(200, null, {
      users: result,
      totalUsers,
      totalPages,
      currentPage: page,
      pageSize: limit
    }));
  } catch (error) {
    // ERROR: Ghi log lỗi khi lấy danh sách người dùng theo role
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

// ANCHOR: Tìm kiếm người dùng theo email
exports.getUserByEmail = async (req, res) => {
  const { email } = req.params;

  // IMPORTANT: Kiểm tra từ khóa email
  if (!email || email.trim() === '') {
    return res.status(400).json(createResponse(400, 'Vui lòng nhập từ khóa email để tìm kiếm', null));
  }

  try {
    // NOTE: Tìm kiếm người dùng theo email (sử dụng regex để tìm kiếm một phần)
    const users = await User.find(
      { email: { $regex: email, $options: 'i' } },
      '-password'
    );

    if (!users || users.length === 0) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng nào với email chứa từ khóa này', null));
    }

    return res.status(200).json(createResponse(200, null, users));
  } catch (error) {
    // ERROR: Ghi log lỗi khi tìm kiếm người dùng
    return res.status(500).json(createResponse(500, 'Lỗi server khi tìm kiếm người dùng', error.message));
  }
};

// ANCHOR: Làm mới token
exports.refreshToken = async (req, res) => {
  const authHeader = req.headers.authorization;

  // IMPORTANT: Kiểm tra token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(createResponse(401, 'Token không được cung cấp', null));
  }

  const token = authHeader.split(' ')[1];

  // NOTE: Xác thực token hiện tại
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json(createResponse(401, 'Token không hợp lệ hoặc đã hết hạn', null));
    }

    try {
      // NOTE: Tìm người dùng từ payload token
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
      }

      // IMPORTANT: Tạo token mới
      const newToken = jwt.sign({
        userId: user._id,
        email: user.email,
        user_name: user.user_name,
        role: user.role,
      }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // NOTE: Chỉ trả chuỗi thông báo thành công
      return res.status(200).json(createResponse(200, null, 'Gia hạn token thành công'));
    } catch (error) {
      // ERROR: Ghi log lỗi khi refresh token
      return res.status(500).json(createResponse(500, 'Lỗi server khi refresh token', error.message));
    }
  });
};

// ANCHOR: Cập nhật thông tin cá nhân
exports.updateProfile = async (req, res) => {
  const { userId } = req.params;
  const {
    user_name,
    email,
    full_name,
    phone_number,
    date_of_birth,
    gender,
    url_image,
  } = req.body;

  // IMPORTANT: Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(404).json(createResponse(404, 'ID người dùng không hợp lệ', null));
  }

  try {
    // NOTE: Tìm người dùng theo ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
    }

    // WARNING: Kiểm tra có trường nào cần cập nhật không
    if (
      user_name === undefined &&
      email === undefined &&
      full_name === undefined &&
      phone_number === undefined &&
      date_of_birth === undefined &&
      gender === undefined &&
      url_image === undefined
    ) {
      return res.status(200).json(createResponse(200, null, 'Không có trường nào được cập nhật'));
    }

    // NOTE: Cập nhật các trường nếu có
    if (user_name !== undefined) user.user_name = user_name;
    if (email !== undefined) user.email = email;
    if (full_name !== undefined) user.full_name = full_name;
    if (phone_number !== undefined) user.phone_number = phone_number;

    // IMPORTANT: Xử lý ngày sinh
    if (date_of_birth !== undefined) {
      const date = new Date(date_of_birth);
      if (isNaN(date.getTime())) {
        return res.status(400).json(createResponse(400, 'Ngày sinh không hợp lệ', null));
      }
      user.date_of_birth = date;
    }

    if (gender !== undefined) user.gender = gender;
    if (url_image !== undefined) user.url_image = url_image;

    await user.save();

    return res.status(200).json(createResponse(200, null, 'Cập nhật thông tin thành công'));
  } catch (error) {
    // ERROR: Ghi log lỗi khi cập nhật thông tin
    return res.status(500).json(createResponse(500, 'Lỗi khi cập nhật thông tin', error.message));
  }
};

// ANCHOR: Đăng xuất
exports.logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // IMPORTANT: Kiểm tra token
    if (!token) {
      return res.status(400).json(createResponse(400, 'Token không tồn tại', null));
    }

    // NOTE: Lấy user từ middleware xác thực (giả sử req.user đã được set bởi middleware auth)
    const userId = req.user.userId;

    // Tìm user và xóa token hiện tại khỏi mảng tokens
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
    }

    // IMPORTANT: Xóa token hiện tại khỏi mảng tokens
    user.tokens = user.tokens.filter(t => t !== token);
    await user.save();

    res.json(createResponse(200, null, 'Đăng xuất thành công'));
  } catch (error) {
    // ERROR: Ghi log lỗi khi đăng xuất
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};

// ANCHOR: Đăng xuất tất cả thiết bị
exports.logoutAll = async (req, res) => {
  try {
    // NOTE: Lấy user từ middleware xác thực
    const userId = req.user.userId;

    // Tìm user và xóa tất cả token
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
    }

    // IMPORTANT: Xóa tất cả token
    user.tokens = [];
    await user.save();

    res.json(createResponse(200, null, 'Đăng xuất khỏi tất cả thiết bị thành công'));
  } catch (error) {
    // ERROR: Ghi log lỗi khi đăng xuất tất cả thiết bị
    res.status(500).json(createResponse(500, 'Lỗi server', error.message));
  }
};




// IDEA: Thêm chức năng thay đổi mật khẩu cho người dùng đã đăng nhập
// TODO: Thêm chức năng xác thực email sau khi đăng ký
// WARNING: Cần thay đổi cách lưu trữ thông tin đăng nhập để tăng tính bảo mật
// LINK: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html - Tài liệu về bảo mật xác thực

// END-SECTION