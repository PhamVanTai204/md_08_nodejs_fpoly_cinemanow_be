const express = require('express');
const router = express.Router();
const vnpaymnetControllers = require('../controllers/vnpayment.controller');

// API tạo URL thanh toán
router.post('/createvnpayurl', vnpaymnetControllers.createPaymentUrl);

// API lấy danh sách ngân hàng
router.get('/banks', vnpaymnetControllers.getBankList);

// API nhận callback từ VNPAY sau khi thanh toán
router.get('/payment-callback', vnpaymnetControllers.paymentCallback);

// API kiểm tra trạng thái thanh toán
router.get('/status/:orderId', vnpaymnetControllers.checkPaymentStatus);

module.exports = router; 