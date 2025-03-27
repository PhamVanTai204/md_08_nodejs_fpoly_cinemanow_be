const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seat.controller');
const { verifyToken } = require('../middleware/auth');

// Routes không cần xác thực (công khai)
router.get('/get-all', seatController.getSeats); // Lấy tất cả ghế
router.get('/get-by-id/:id', seatController.getSeatById); // Lấy ghế theo ID
router.get('/get-by-room/:roomId', seatController.getSeatsByRoom); // Lấy ghế theo phòng

// Routes cần xác thực
router.post('/create', verifyToken, seatController.addSeat); // Thêm ghế mới
router.put('/update/:id', verifyToken, seatController.updateSeat); // Cập nhật ghế
router.delete('/delete/:id', verifyToken, seatController.deleteSeat); // Xóa ghế

module.exports = router; 