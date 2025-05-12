var express = require('express');
var router = express.Router();
const cinemaController = require('../controllers/cinema.controller'); // Đảm bảo đường dẫn chính xác

// Lấy hết rạp phim
router.get('/getcinema', cinemaController.getCinema);

// Lấy rạp phim theo ID
router.get('/getcinemaById/:id', cinemaController.getCinemaId);

// Lấy rạp theo phim
router.get('/get-by-movie/:movie_id', cinemaController.getCinemasByMovie);

// Lấy suất chiếu theo rạp
router.get('/showtimes/:cinema_id', cinemaController.getShowtimesByCinema);

// Lấy thông tin phòng chiếu theo ID suất chiếu
router.get('/showtime/room/:showtime_id', cinemaController.getRoomByShowtime);

// Thêm rạp phim
router.post('/addcinema', cinemaController.addCinema);

// Cập nhật rạp phim
router.put('/editcinema/:id', cinemaController.updateCinema);

// Xóa rạp phim
router.delete('/deletecinema/:id', cinemaController.deleteCinema);

// Tìm kiếm rạp phim theo tên hoặc địa điểm
router.get('/search', cinemaController.searchCinema);

// Lấy danh sách ghế theo ID phòng
router.get('/rooms/seats/:room_id', cinemaController.getSeatsByRoom);

// Lấy danh sách ghế theo ID phòng và ID suất chiếu
router.get('/rooms/seats/:showtime_id/:room_id/', cinemaController.getSeatsByRoomAndShowTime);

module.exports = router;