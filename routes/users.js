var express = require('express');
var router = express.Router();
const uc = require('../controllers/user.controller')

router.post('/reg', uc.reg)
router.post('/login', uc.login)

//Nhập email gửi mã OTP 
router.post('/forgotpassword', uc.forgotPassword)
//Xác nhận mã OTP
router.post('/forgotpassword/confirmOTP', uc.confirmOTP)
//Đổi mật khẩu 
router.post('/resetPassword', uc.resetPassword)

module.exports = router;
