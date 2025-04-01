const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucher.controller');

// Lấy tất cả voucher
router.get('/get-all', voucherController.getAllVouchers);

// Lấy voucher theo ID
router.get('/get-by-id/:id', voucherController.getVoucherById);

// Tạo voucher mới
router.post('/create', voucherController.createVoucher);

// Cập nhật voucher
router.put('/update/:id', voucherController.updateVoucher);

// Xóa voucher
router.delete('/delete/:id', voucherController.deleteVoucher);

// Áp dụng voucher vào đơn hàng
router.post('/apply', voucherController.applyVoucher);

module.exports = router; 