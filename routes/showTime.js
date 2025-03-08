const express = require('express');
const router = express.Router();
const showTimeController = require('../controllers/showTime.controller');

// Lấy danh sách suất chiếu
router.get('/getAll', showTimeController.getShowTimes);


module.exports = router;
