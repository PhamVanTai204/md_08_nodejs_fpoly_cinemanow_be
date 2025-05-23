const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
// Lấy danh sách đánh giá
router.get('/get-all', reviewController.getAllReviews);

// Lấy thông tin đánh giá theo ID
router.get('/get-by-id/:id', reviewController.getReviewById);

// Lấy danh sách đánh giá theo phim
router.get('/get-by-movie/:movie_id', reviewController.getReviewsByMovieId);

// Tạo đánh giá mới
router.post('/create', reviewController.createReview);

// Cập nhật đánh giá
router.put('/update/:id', reviewController.updateReview);

// Xóa đánh giá
router.delete('/delete/:id', reviewController.deleteReview);

//Báo cáo đánh giá
router.post('/report-comment', reviewController.reportComment);

//Lấy danh sách báo cáo
router.get('/reports', reviewController.getAllReports);

module.exports = router; 