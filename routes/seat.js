const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seat.controller');

// Lấy tất cả ghế
router.get('/get-all', seatController.getAllSeats);

// Lấy ghế theo ID
router.get('/get-by-id/:id', seatController.getSeatById);

// Tạo ghế mới
router.post('/create', seatController.createSeat);

// Cập nhật ghế
router.put('/update/:id', seatController.updateSeat);

// Xóa ghế
router.delete('/delete/:id', seatController.deleteSeat);

module.exports = router; 