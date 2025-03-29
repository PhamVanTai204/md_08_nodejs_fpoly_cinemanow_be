const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Kiểm tra xem các hàm có tồn tại không
console.log('Payment Controller:', paymentController);

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

// Xác nhận thanh toán thành công
router.post('/confirm', paymentController.confirmPayment);

// Xử lý thanh toán không thành công
router.post('/failed', paymentController.failedPayment);

// Nếu bạn có route GET, hãy đảm bảo có callback function
// Ví dụ:
// router.get('/methods', paymentController.getPaymentMethods);

module.exports = router; 