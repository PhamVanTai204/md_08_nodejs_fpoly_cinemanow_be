const express = require('express');
const router = express.Router();
const filmController = require('../controllers/film.controller');
const { verifyToken } = require('../middleware/auth');

// Routes không cần xác thực (công khai)
router.get('/get-all', filmController.getFilm); // Lấy tất cả phim
router.get('/get-by-id/:id', filmController.getFilmId); // Lấy phim theo ID
router.get('/get-by-genre/:genreId', filmController.getFilmsByGenre); // Lấy phim theo thể loại
router.get('/search-by-title', filmController.searchFilm); // Tìm kiếm phim theo tên

// Routes cần xác thực
router.post('/create', verifyToken, filmController.addFilm); // Thêm phim mới
router.put('/update/:id', verifyToken, filmController.updateFilm); // Cập nhật phim
router.delete('/delete/:id', verifyToken, filmController.deleteFilm); // Xóa phim

module.exports = router;