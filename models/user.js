const db = require('./db');

const userSchema = db.mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  urlImage: {
    type: String,
    required: true,
  },
  phone_number: {
    type: Number,
    required: false,
  },
  full_name: {
    type: String,
    required: false,
  },
  date_of_birth: {
    type: Date,
    required: false, // Đã sửa lỗi chính tả
  },
  gender: {
    type: Number, // Đã sửa lỗi chính tả
    required: false,
  },
  role: {
    type: Number, // Đã sửa lỗi chính tả
    required: true,
  }

}, { timestamps: true });

const User = db.mongoose.model('User', userSchema);

module.exports = User;
