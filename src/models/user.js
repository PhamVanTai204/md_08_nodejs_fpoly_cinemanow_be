const db = require('./db');

const userSchema = db.mongoose.Schema({
  user_name: {
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
  url_image: {
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
  location:{
    type: String,
    required: false,
  },
  gender: {
    type: Number, // Đã sửa lỗi chính tả
    required: false,
  },
  role: {
    type: Number, // Đã sửa lỗi chính tả
    required: true,
  },
  cinema_id: {
    type: db.mongoose.Schema.Types.ObjectId,
    ref: 'Cinema',
    required: false,
  }


}, { timestamps: true });

const User = db.mongoose.model('User', userSchema);

module.exports = User;