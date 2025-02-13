const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const router = express.Router();

// Đăng ký
exports.reg = async (req, res) => {
  const { name, username, email, password } = req.body;

  try {
    // Kiểm tra xem email hoặc username đã tồn tại chưa
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ msg: 'Email hoặc username đã tồn tại' });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo người dùng mới
    user = new User({
      name,
      username,
      email,
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ msg: 'Đăng ký thành công' });

  } catch (error) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
}

// Đăng nhập
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Tìm người dùng theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Email không tồn tại' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Mật khẩu không đúng' });
    }

    // Tạo token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });

  } catch (error) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
};



function generateRandomSixDigitNumber() {
  return Math.floor(100000 + Math.random() * 900000);
}

console.log(generateRandomSixDigitNumber());


// Quên mật khẩu 
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const otp = generateRandomSixDigitNumber(); // Tạo mã OTP

    // Tìm người dùng theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Email không tồn tại' });
    }


    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'sanndph32936@fpt.edu.vn',
        pass: 'tlqb wbgl llzt mbnw',
      }
    })

    const mailOptions = {
      from: 'sanndph32936@fpt.edu.vn',
      to: user.email,
      subject: 'Password Reset OTP',

      html: `<p>You requested a password reset</p>
             <p>Your OTP code is: <strong>${otp}</strong></p>`

    }

    await transporter.sendMail(mailOptions);
    user.otp = otp;
    user.save();




    res.json({ message: 'Check your email for the OTP code' });

  } catch (error) {

    res.status(500).json({ msg: 'Lỗi server' + error });
  }
};

// Xác nhận mã otp 
exports.confirmOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {


    // Tìm người dùng theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Email không tồn tại' });
    }

    if (user.otp != otp) {
      return res.status(400).json({ msg: 'Nhập sai mã OTP' });
    }

    res.json({ message: 'OTP hợp lệ' });

  } catch (error) {

    res.status(500).json({ msg: 'Lỗi server' + error });
  }
};


// Xác nhận mã otp 
exports.resetPassword = async (req, res) => {
  const { email, password } = req.body;

  try {


    // Tìm người dùng theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Email không tồn tại' });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword
    user.otp = undefined;
    user.save()

    res.json({ message: 'Đổi mật khẩu thành công' });

  } catch (error) {

    res.status(500).json({ msg: 'Lỗi server' + error });
  }
};
