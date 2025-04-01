const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethod.controller');

// Lấy danh sách phương thức thanh toán
router.get('/get-all', paymentMethodController.getAllPaymentMethods);

// Lấy thông tin phương thức thanh toán theo ID
router.get('/get-by-id/:id', paymentMethodController.getPaymentMethodById);

// Tạo phương thức thanh toán mới
router.post('/create', paymentMethodController.createPaymentMethod);

// Cập nhật phương thức thanh toán
router.put('/update/:id', paymentMethodController.updatePaymentMethod);

// Xóa phương thức thanh toán
router.delete('/delete/:id', paymentMethodController.deletePaymentMethod);

module.exports = router; 