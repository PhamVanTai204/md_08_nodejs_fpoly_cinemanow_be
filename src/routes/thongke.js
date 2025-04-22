const express = require('express');
const revenueController = require('../controllers/thongke.controller');
const router = express.Router();

router.get('/date-range', revenueController.getRevenueByDateRange);
router.get('/day', revenueController.getRevenueByDay);
router.get('/month', revenueController.getRevenueByMonth);

router.get('/year', revenueController.getRevenueByYear);
router.get('/detailed', revenueController.getDetailedRevenueStats);
router.get('/by-cinema', revenueController.getRevenueByCinema);
router.get('/by-movie', revenueController.getRevenueByMovie);

module.exports = router;