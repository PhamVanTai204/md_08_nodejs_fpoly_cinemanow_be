const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Lấy danh sách thanh toán
router.get('/get-all', paymentController.getAllPayments);
router.post('/create', paymentController.addPayment);

router.put('/process-action', paymentController.processPaymentAction);


module.exports = router; 