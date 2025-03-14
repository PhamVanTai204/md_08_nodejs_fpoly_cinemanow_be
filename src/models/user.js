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
    required: false, 
  },
  gender: {
    type: Number, 
    required: false,
  },
  role: {
    type: Number, 
    required: true,
  }

}, { timestamps: true });

const User = db.mongoose.model('User', userSchema);

module.exports = User;