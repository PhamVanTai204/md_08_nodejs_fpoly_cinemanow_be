const Review = require('../models/review');
const User = require('../models/user');
const Film = require('../models/film');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// SECTION: API quản lý đánh giá phim

// ANCHOR: Lấy tất cả đánh giá
exports.getAllReviews = async (req, res) => {
    try {
        // NOTE: Populate thông tin người dùng và phim, sắp xếp theo ngày mới nhất
        const reviews = await Review.find()
            .populate('user_id')
            .populate('movie_id')
            .sort({ date: -1 }); // Sắp xếp theo ngày mới nhất
        res.json(createResponse(200, null, reviews));
    } catch (error) {
        console.error('Get all reviews error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách đánh giá', null));
    }
};

// ANCHOR: Lấy đánh giá theo ID
exports.getReviewById = async (req, res) => {
    try {
        const id = req.params.id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID đánh giá không hợp lệ', null));
        }

        // NOTE: Populate thông tin người dùng và phim
        const review = await Review.findById(id)
            .populate('user_id')
            .populate('movie_id');

        if (!review) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy đánh giá', null));
        }

        res.json(createResponse(200, null, review));
    } catch (error) {
        console.error('Get review by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin đánh giá', null));
    }
};

// ANCHOR: Lấy đánh giá theo ID phim
exports.getReviewsByMovieId = async (req, res) => {
    try {
        const movie_id = req.params.movie_id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID phim
        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

        // NOTE: Populate thông tin người dùng và phim, sắp xếp theo ngày mới nhất
        const reviews = await Review.find({ movie_id })
            .populate('user_id')
            .populate('movie_id')
            .sort({ date: -1 }); // Sắp xếp theo ngày mới nhất

        res.json(createResponse(200, null, reviews));
    } catch (error) {
        console.error('Get reviews by movie id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách đánh giá theo phim', null));
    }
};

// ANCHOR: Tạo đánh giá mới
exports.createReview = async (req, res) => {
    try {
        const { review_id, user_id, movie_id, comment } = req.body;

        // IMPORTANT: Kiểm tra đầy đủ thông tin
        if (!review_id || !user_id || !movie_id || !comment) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // WARNING: Kiểm tra review_id đã tồn tại
        const existingReview = await Review.findOne({ review_id });
        if (existingReview) {
            return res.status(400).json(createResponse(400, 'Mã đánh giá đã tồn tại', null));
        }

        // SECTION: Kiểm tra thông tin liên quan
        // NOTE: Kiểm tra user tồn tại
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
        }
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
        }

        // NOTE: Kiểm tra movie tồn tại
        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }
        const movie = await Film.findById(movie_id);
        if (!movie) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }

        // NOTE: Tạo đối tượng đánh giá mới với ngày hiện tại
        const newReview = new Review({
            review_id,
            user_id,
            movie_id,
            comment,
            date: new Date()
        });

        // DONE: Lưu đánh giá vào cơ sở dữ liệu
        const savedReview = await newReview.save();
        
        // NOTE: Populate thông tin người dùng và phim
        const populatedReview = await Review.findById(savedReview._id)
            .populate('user_id')
            .populate('movie_id');

        res.status(201).json(createResponse(201, 'Tạo đánh giá thành công', populatedReview));
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo đánh giá', null));
    }
};

// ANCHOR: Cập nhật đánh giá
exports.updateReview = async (req, res) => {
    try {
        const { comment } = req.body;
        const id = req.params.id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID đánh giá không hợp lệ', null));
        }

        // NOTE: Tìm kiếm đánh giá cần cập nhật
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy đánh giá', null));
        }

        // NOTE: Cập nhật nội dung đánh giá nếu được cung cấp
        if (comment) {
            review.comment = comment;
            review.date = new Date(); // HIGHLIGHT: Cập nhật ngày khi sửa comment
        }

        // DONE: Lưu thông tin đã cập nhật
        const updatedReview = await review.save();
        
        // NOTE: Populate thông tin người dùng và phim
        const populatedReview = await Review.findById(updatedReview._id)
            .populate('user_id')
            .populate('movie_id');

        res.json(createResponse(200, 'Cập nhật đánh giá thành công', populatedReview));
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật đánh giá', null));
    }
};

// ANCHOR: Xóa đánh giá
exports.deleteReview = async (req, res) => {
    try {
        const id = req.params.id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID đánh giá không hợp lệ', null));
        }

        // NOTE: Tìm kiếm đánh giá cần xóa
        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy đánh giá', null));
        }

        // DONE: Xóa đánh giá
        await Review.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa đánh giá thành công', null));
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa đánh giá', null));
    }
};

// TODO: Thêm API kiểm tra người dùng đã đánh giá phim chưa
// TODO: Thêm API lấy điểm đánh giá trung bình của phim
// IDEA: Thêm tính năng phân tích cảm xúc từ nội dung đánh giá
// OPTIMIZE: Cần thêm phân trang cho API lấy tất cả đánh giá