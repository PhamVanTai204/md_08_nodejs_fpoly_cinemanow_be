const express = require('express');
const router = express.Router();
const showTimeController = require('../controllers/showTime.controller');

// Lấy danh sách suất chiếu
router.get('/getAll', showTimeController.getShowTimes);

// Lấy suất chiếu theo ID
router.get('/getById/:id', showTimeController.getShowTimeById);

// Thêm suất chiếu mới
router.post('/addShowTime', showTimeController.addShowTime);

// Cập nhật suất chiếu theo ID
router.put('/updateShowTime/:id', showTimeController.updateShowTime);

// Xóa suất chiếu theo ID
router.delete('/deleteShowTime/:id', showTimeController.deleteShowTime);

module.exports = router;
