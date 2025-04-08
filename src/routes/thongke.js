const express = require('express');
const revenueController = require('../controllers/thongke.controller');
const router = express.Router();

router.get('/date-range', revenueController.getRevenueByDateRange);
router.get('/day', revenueController.getRevenueByDay);
router.get('/month', revenueController.getRevenueByMonth);


module.exports = router;