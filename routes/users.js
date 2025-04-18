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
// Lấy danh sách tất cả user
router.get('/getAll', uc.getAllUsers);

// Lấy thông tin user theo ID
router.get('/getById/:id', uc.getUserById);
 router.put('/updateprofile/:id', uc.updateUserDetails);
 router.get('/usersByRole', uc.getUsersByRole);

// Route lấy thông tin user theo email
router.get('/get-by-email/:email', uc.getUserByEmail);

// Route refresh token
router.get('/refresh-token/:token', uc.refreshToken);

 module.exports = router;

