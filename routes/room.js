const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');

// Lấy danh sách phòng chiếu
router.get('/', roomController.getRooms);

// Lấy phòng chiếu theo ID
router.get('/:id', roomController.getRoomById);

// Thêm phòng chiếu mới
router.post('/', roomController.addRoom);

// Cập nhật phòng chiếu
router.put('/:id', roomController.updateRoom);

// Xóa phòng chiếu
router.delete('/:id', roomController.deleteRoom);

module.exports = router;