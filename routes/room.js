const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const { verifyToken } = require('../middleware/auth');

// Routes không cần xác thực (công khai)
router.get('/get-all', roomController.getRooms); // Lấy tất cả phòng
router.get('/get-by-id/:id', roomController.getRoomById); // Lấy phòng theo ID
router.get('/get-by-cinema/:cinemaId', roomController.getRoomsByCinema); // Lấy phòng theo rạp

// Routes cần xác thực
router.post('/create', verifyToken, roomController.addRoom); // Thêm phòng mới
router.put('/update/:id', verifyToken, roomController.updateRoom); // Cập nhật phòng
router.delete('/delete/:id', verifyToken, roomController.deleteRoom); // Xóa phòng

module.exports = router;