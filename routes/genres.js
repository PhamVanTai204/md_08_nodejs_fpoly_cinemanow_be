const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genres.controller');
const { verifyToken } = require('../middleware/auth');

// Routes không cần xác thực (công khai)
router.get('/get-all', genreController.getAllGenres); // Lấy tất cả thể loại
router.get('/get-by-id/:id', genreController.getGenreById); // Lấy thể loại theo ID

// Routes cần xác thực
router.post('/create', verifyToken, genreController.createGenre); // Thêm thể loại mới
router.put('/update/:id', verifyToken, genreController.updateGenre); // Cập nhật thể loại
router.delete('/delete/:id', verifyToken, genreController.deleteGenre); // Xóa thể loại

module.exports = router;