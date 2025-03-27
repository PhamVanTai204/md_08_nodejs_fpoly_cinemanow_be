const express = require('express');
const router = express.Router();
const cinemaController = require('../controllers/cinema.controller');
const { verifyToken } = require('../middleware/auth');

// Routes không cần xác thực (công khai)
router.get('/get-all', cinemaController.getCinemas); // Lấy tất cả rạp
router.get('/get-by-id/:id', cinemaController.getCinemaById); // Lấy rạp theo ID

// Routes cần xác thực
router.post('/create', verifyToken, cinemaController.addCinema); // Thêm rạp mới
router.put('/update/:id', verifyToken, cinemaController.updateCinema); // Cập nhật rạp
router.delete('/delete/:id', verifyToken, cinemaController.deleteCinema); // Xóa rạp

module.exports = router;