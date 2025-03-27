const express = require('express');
const router = express.Router();
const showTimeController = require('../controllers/showTime.controller');
const { verifyToken } = require('../middleware/auth');

// Routes không cần xác thực (công khai)
router.get('/get-all-films', showTimeController.getFilmsWithShowTimes); // Lấy tất cả phim với lịch chiếu
router.get('/get-by-id/:id', showTimeController.getShowTimeById); // Lấy chi tiết suất chiếu

// Routes cần xác thực
router.post('/create', verifyToken, showTimeController.addShowTime); // Thêm suất chiếu mới
router.put('/update/:id', verifyToken, showTimeController.updateShowTime); // Cập nhật suất chiếu
router.delete('/delete/:id', verifyToken, showTimeController.deleteShowTime); // Xóa suất chiếu

module.exports = router;
