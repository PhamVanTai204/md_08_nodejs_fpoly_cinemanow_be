const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Lấy danh sách thanh toán
router.get('/get-all', paymentController.getAllPayments);

// Lấy thông tin thanh toán theo ID
router.get('/get-by-id/:id', paymentController.getPaymentById);

// Tạo thanh toán mới
router.post('/create', paymentController.createPayment);

// Cập nhật thanh toán
router.put('/update/:id', paymentController.updatePayment);

// Xóa thanh toán
router.delete('/delete/:id', paymentController.deletePayment);

// Xác nhận thanh toán
router.post('/confirm', paymentController.confirmPayment);

module.exports = router; 