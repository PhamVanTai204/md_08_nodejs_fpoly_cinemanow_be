const express = require('express');
const router = express.Router();
const showTimeController = require('../controllers/showTime.controller');

// Lấy danh sách suất chiếu
router.get('/getAll', showTimeController.getShowTimes);

// Lấy suất chiếu theo ID
router.get('/getById/:id', showTimeController.getShowTimeById);

// Thêm suất chiếu mới
router.post('/addShowTime', showTimeController.addShowTime);


module.exports = router;
