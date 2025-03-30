const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');

// Lấy danh sách vé
router.get('/get-all', ticketController.getAllTickets);

// Lấy thông tin vé theo ID
router.get('/get-by-id/:id', ticketController.getTicketById);

// Tạo vé mới
router.post('/create', ticketController.createTicket);

// Cập nhật vé
router.put('/update/:id', ticketController.updateTicket);

// Xóa vé
router.delete('/delete/:id', ticketController.deleteTicket);

module.exports = router; 