const express = require('express');
const router = express.Router();
const uc = require('../controllers/user.controller');
const auth = require('../middleware/auth'); // Middleware xác thực

router.post('/reg', uc.reg);
router.post('/login', uc.login);
router.post('/forgotpassword', uc.forgotPassword);
router.post('/forgotpassword/confirmOTP', uc.confirmOTP);
router.post('/resetPassword', uc.resetPassword);

router.get('/getAll', uc.getAllUsers);
router.get('/getById/:id', uc.getUserById);
router.get('/usersByRole/:role', uc.getUsersByRole);
router.get('/searchEmail/:email', uc.getUserByEmail);
router.get('/refresh-token', uc.refreshToken);

router.patch('/update-profile/:userId', uc.updateProfile);

// Route đăng xuất - chỉ đăng xuất thiết bị hiện tại
router.post('/logout', auth, uc.logout);

// Route đăng xuất tất cả thiết bị
router.post('/logout-all', auth, uc.logoutAll);

router.delete('/deleteUser/:id', uc.deleteUser);
module.exports = router;
