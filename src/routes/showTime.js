const express = require('express');
const router = express.Router();
const showTimeController = require('../controllers/showTime.controller');

// Public routes
// Lấy tất cả suất chiếu
router.get('/get-all', showTimeController.getAllShowTimes);

// Lấy suất chiếu theo ID
router.get('/get-by-id/:id', showTimeController.getShowTimeById);

// API Mobile - Lấy suất chiếu theo ID phim
router.get('/mobile/get-by-movie/:movie_id', showTimeController.getShowTimesByMovieId);

router.get('/mobile/get-showtime-by-cinema-film/:movie_id/:cinema_id', showTimeController.getShowTimesByMovieAndCinema)

// Tạo suất chiếu mới
router.post('/create', showTimeController.createShowTime);

// Cập nhật suất chiếu
router.put('/update/:id', showTimeController.updateShowTime);

// Xóa suất chiếu
router.delete('/delete/:id', showTimeController.deleteShowTime);
router.get('/by-movie-and-cinema', showTimeController.getShowTimesByMovieAndCinemaGroupedByDate);

module.exports = router;
