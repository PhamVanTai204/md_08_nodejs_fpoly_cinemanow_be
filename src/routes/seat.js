const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seat.controller');

// Lấy tất cả ghế
router.get('/get-all', seatController.getAllSeats);

// Lấy ghế theo ID
router.get('/get-by-id/:id', seatController.getSeatById);

// THÊM MỚI: Lấy trạng thái ghế theo showtime
router.get('/showtime/:room_id/:showtime_id', seatController.getSeatsByShowtime);

// Tạo ghế mới
router.post('/create', seatController.createSeat);

// Cập nhật ghế
router.put('/update/:id', seatController.updateSeatStatus);

// Xóa ghế
router.delete('/delete/:id', seatController.deleteSeat);
router.delete('/deletemuti', seatController.deleteMultipleSeats);

router.post('/addmuti', seatController.addMultipleSeats);
router.put('/updatemuti', seatController.updateMultipleSeatsInfo);

// Thêm nhiều ghế vào phòng
router.post('/create-multiple', seatController.createMultipleSeats);

// Routes mới cho chức năng realtime đặt vé
router.post('/select-temporary', seatController.temporarySelectSeats);
router.post('/release', seatController.releaseSeats);
router.post('/initiate-payment', seatController.initiatePayment);

module.exports = router;