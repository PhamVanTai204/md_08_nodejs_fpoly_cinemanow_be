const express = require('express');
const router = express.Router();
const cinemaController = require('../controllers/cinema.controller');

// Lấy danh sách rạp chiếu
router.get('/', cinemaController.getCinemas);

// Lấy rạp chiếu theo ID
router.get('/:id', cinemaController.getCinemaById);

// Thêm rạp chiếu mới
router.post('/', cinemaController.addCinema);

// Cập nhật rạp chiếu
router.put('/:id', cinemaController.updateCinema);

// Xóa rạp chiếu
router.delete('/:id', cinemaController.deleteCinema);

module.exports = router;