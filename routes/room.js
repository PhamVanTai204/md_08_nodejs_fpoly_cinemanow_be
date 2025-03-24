var express = require('express');
var router = express.Router();
const roomController = require('../controllers/room.controller');

// Lấy danh sách phòng
router.get('/getroom', roomController.getRoom);

// Lấy phòng theo ID
router.get('/getroomById/:id', roomController.getRoomId);

// Thêm phòng
router.post('/addroom', roomController.addRoom);

// Cập nhật phòng
router.put('/editroom/:id', roomController.updateRoom);

// Xóa phòng
router.delete('/deleteroom/:id', roomController.deleteRoom);

// Lấy các phòng thuộc 1 cinema
router.get('/cinema/:cinemaId', roomController.getRoomsByCinema);

module.exports = router;