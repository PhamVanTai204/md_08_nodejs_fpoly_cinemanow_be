const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');

// Lấy lịch sử đặt vé của người dùng
router.get('/user/:user_id', transactionController.getTransactionsByUser);

// Tạo vé mới
router.post('/', transactionController.createTicket);

module.exports = router; 