const Review = require('../models/review');
const User = require('../models/user');
const Film = require('../models/film');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy tất cả review
exports.getAllReviews = async (req, res) => {
    try {
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

// Lấy review theo ID
exports.getReviewById = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID đánh giá không hợp lệ', null));
        }

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

// Lấy reviews theo movie_id
exports.getReviewsByMovieId = async (req, res) => {
    try {
        const movie_id = req.params.movie_id;

        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

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

// Tạo review mới
exports.createReview = async (req, res) => {
    try {
        const { review_id, user_id, movie_id, comment } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!review_id || !user_id || !movie_id || !comment) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra review_id đã tồn tại
        const existingReview = await Review.findOne({ review_id });
        if (existingReview) {
            return res.status(400).json(createResponse(400, 'Mã đánh giá đã tồn tại', null));
        }

        // Kiểm tra user tồn tại
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
        }
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy người dùng', null));
        }

        // Kiểm tra movie tồn tại
        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }
        const movie = await Film.findById(movie_id);
        if (!movie) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }

        const newReview = new Review({
            review_id,
            user_id,
            movie_id,
            comment,
            date: new Date()
        });

        const savedReview = await newReview.save();
        const populatedReview = await Review.findById(savedReview._id)
            .populate('user_id')
            .populate('movie_id');

        res.status(201).json(createResponse(201, 'Tạo đánh giá thành công', populatedReview));
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo đánh giá', null));
    }
};

// Cập nhật review
exports.updateReview = async (req, res) => {
    try {
        const { comment } = req.body;
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID đánh giá không hợp lệ', null));
        }

        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy đánh giá', null));
        }

        if (comment) {
            review.comment = comment;
            review.date = new Date(); // Cập nhật ngày khi sửa comment
        }

        const updatedReview = await review.save();
        const populatedReview = await Review.findById(updatedReview._id)
            .populate('user_id')
            .populate('movie_id');

        res.json(createResponse(200, 'Cập nhật đánh giá thành công', populatedReview));
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật đánh giá', null));
    }
};

// Xóa review
exports.deleteReview = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID đánh giá không hợp lệ', null));
        }

        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy đánh giá', null));
        }

        await Review.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa đánh giá thành công', null));
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa đánh giá', null));
    }
}; 