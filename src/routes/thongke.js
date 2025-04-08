const express = require('express');
const revenueController = require('../controllers/thongke.controller');
const router = express.Router();

router.get('/date-range', revenueController.getRevenueByDateRange);

module.exports = router;