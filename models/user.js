const db = require('./db');

const userSchema = db.mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone_number: {
    type: Number,
    required: true,
  },
  full_name: {
    type: String,
    required: true,
  },
  date_of_birth: {
    type: Date,
    required: true, // Đã sửa lỗi chính tả
  },
  gender: {
    type: Number, // Đã sửa lỗi chính tả
    required: true,
  },
  role: {
    type: Number, // Đã sửa lỗi chính tả
    required: true,
  }

}, { timestamps: true });

const User = db.mongoose.model('User', userSchema);

module.exports = User;
