const express = require('express');
const router = express.Router();
const showTimeController = require('../controllers/showTime.controller');

// Lấy danh sách phim với lịch chiếu
router.get('/films', showTimeController.getFilmsWithShowTimes);

// Thêm lịch chiếu mới
router.post('/', showTimeController.addShowTime);

// Cập nhật lịch chiếu
router.put('/:id', showTimeController.updateShowTime);

// Xóa lịch chiếu
router.delete('/:id', showTimeController.deleteShowTime);

module.exports = router;
