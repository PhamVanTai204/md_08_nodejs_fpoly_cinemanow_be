const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }, // Tự động xóa sau 5 phút
});

const OTP = mongoose.model('OTP', otpSchema, 'otps');

module.exports = OTP;
