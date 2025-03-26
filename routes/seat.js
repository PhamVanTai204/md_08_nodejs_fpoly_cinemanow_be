const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seat.controller');

// Lấy danh sách ghế theo phòng chiếu
router.get('/room/:roomId', seatController.getSeatsByRoom);

// Lấy ghế theo ID
router.get('/:id', seatController.getSeatById);

// Thêm ghế mới
router.post('/', seatController.addSeat);

// Cập nhật ghế
router.put('/:id', seatController.updateSeat);

// Xóa ghế
router.delete('/:id', seatController.deleteSeat);

module.exports = router; 