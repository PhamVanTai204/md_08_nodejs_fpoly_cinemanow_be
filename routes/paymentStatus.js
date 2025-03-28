const express = require('express');
const router = express.Router();
const paymentStatusController = require('../controllers/paymentStatus.controller');

// Lấy danh sách trạng thái thanh toán
router.get('/get-all', paymentStatusController.getAllPaymentStatuses);

// Lấy thông tin trạng thái thanh toán theo ID
router.get('/get-by-id/:id', paymentStatusController.getPaymentStatusById);

// Tạo trạng thái thanh toán mới
router.post('/create', paymentStatusController.createPaymentStatus);

// Cập nhật trạng thái thanh toán
router.put('/update/:id', paymentStatusController.updatePaymentStatus);

// Xóa trạng thái thanh toán
router.delete('/delete/:id', paymentStatusController.deletePaymentStatus);

module.exports = router; 