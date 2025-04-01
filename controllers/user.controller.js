const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/user');
const OTP = require('../models/otp.model'); // Import model OTP
const createResponse = require('../utils/responseHelper');



// Đăng ký

exports.reg = async (req, res) => {
  const { user_name, email, password, url_image, role } = req.body;

  // Kiểm tra thông tin bắt buộc
  if (!user_name || !email || !password || role === undefined) {
    return res.status(400).json(createResponse(400, 'Vui lòng điền đầy đủ thông tin', null));
  }

  // Kiểm tra user_name (chỉ cho phép chữ cái và số, ít nhất 3 ký tự)
  const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
  if (!usernameRegex.test(user_name)) {
    return res.status(400).json(createResponse(400, 'Username không hợp lệ', null));
  }

  // Kiểm tra password (ít nhất 6 ký tự, có chữ và số)
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json(createResponse(400, 'Password không hợp lệ', null));
  }

  // Kiểm tra email (chỉ chấp nhận @gmail.com)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json(createResponse(400, 'Email phải có đuôi @gmail.com', null));
  }

  try {
    // Kiểm tra xem user_name hoặc email đã tồn tại chưa
    let user = await User.findOne({ $or: [{ email }, { user_name }] });
    if (user) {
      return res.status(409).json(createResponse(409, 'Email hoặc user_name đã tồn tại', null));
    }

    // Mã hóa password trước khi lưu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo user mới
    user = new User({ user_name, email, password: hashedPassword, url_image, role });
    await user.save();

    return res.status(201).json(createResponse(201, null, 'Đăng ký thành công'));
  } catch (error) {
    return res.status(500).json(createResponse(500, 'Lỗi server', error.message));
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

    const token = jwt.sign(
      { 
        userId: user._id, 
        user_name: user.user_name, 
        role: user.role, 
        url_image: user.url_image 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.json({
      code: 200,
      error: null,
      data: {
        userId: user._id,
        url_image: user.url_image,
        user_name: user.user_name,
        email: user.email,
        role: user.role,
        url_image: user.url_image,
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
    // Kiểm tra lần gửi OTP gần nhất
    const lastOTP = await OTP.findOne({ email }).sort({ createdAt: -1 });

    if (lastOTP) {
      const timeDiff = (Date.now() - lastOTP.createdAt.getTime()) / 1000; // Tính thời gian trôi qua (giây)
      if (timeDiff < 60) {
        return res.status(400).json(createResponse(400, `OTP đã được gửi tới emai của bạn, vui lòng thử lại sau ${Math.ceil(60 - timeDiff)} giây`, null));
      }
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
 exports.updateUserDetails = async (req, res) => {
  try {
    const { id } = req.params; // Lấy ID từ URL
    const updateData = req.body; // Dữ liệu từ request body

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json(createResponse(404, 'User không tồn tại', null));
    }

    // Cập nhật tất cả các trường có trong request body
    const fieldsToUpdate = ['phone_number', 'full_name', 'date_of_birth', 'gender', 'url_image'];
    fieldsToUpdate.forEach(field => {
      if (updateData[field] !== undefined) {
        user[field] = updateData[field]; // Cập nhật luôn nếu có dữ liệu mới
      }
    });

    await user.save();

    res.json(createResponse(200, 'Cập nhật thông tin thành công', user));
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
 
