var express = require('express');
var router = express.Router();
const uc = require('../controllers/userController')

router.post('/reg', uc.register)
router.post('/login', uc.login)

//Nhập email gửi mã OTP 
router.post('/forgotpassword', uc.forgotPassword)
//Xác nhận mã OTP
router.post('/forgotpassword/confirmOTP', uc.confirmOTP)
//Đổi mật khẩu 
router.post('/resetPassword', uc.resetPassword)
// Lấy danh sách tất cả user
router.get('/getAll', uc.getAllUsers);

// Lấy thông tin user theo ID
router.get('/getById/:id', uc.getUserById);

module.exports = router;
