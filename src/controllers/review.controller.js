const Review = require('../models/review');
const User = require('../models/user');
const Film = require('../models/film');
const Report = require('../models/report'); 
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

// Xử lý báo cáo bình luận
exports.reportComment = async (req, res) => {
    try {
        const { reporterId, reportedUserId, comment, reason, review_id } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!reporterId || !reportedUserId || !comment || !reason || !review_id) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra review tồn tại
        if (!mongoose.Types.ObjectId.isValid(review_id)) {
            return res.status(400).json(createResponse(400, 'ID bình luận không hợp lệ', null));
        }
        
        const review = await Review.findById(review_id);
        if (!review) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy bình luận', null));
        }

        // Ghi thông tin báo cáo vào console
        console.log('===== BÁO CÁO BÌNH LUẬN =====');
        console.log('Reporter ID:', reporterId);
        console.log('Reported User ID:', reportedUserId);
        console.log('Review ID:', review_id);
        console.log('Comment:', comment);
        console.log('Reason:', reason);
        console.log('Time:', new Date().toISOString());
        console.log('==============================');

        // Trả về phản hồi thành công mà không lưu vào DB
        res.status(201).json(createResponse(201, 'Báo cáo đã được gửi thành công', {
            reported: true,
            reviewId: review_id,
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        console.error('Report comment error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi báo cáo bình luận', null));
    }
};
// Lấy reviews theo movie_id
exports.getReviewsByMovieId = async (req, res) => {
    try {
        const movie_id = req.params.movie_id;
        
        // In thông tin debug
        console.log(`[DEBUG] getReviewsByMovieId được gọi với movie_id: ${movie_id}`);

        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            console.log(`[DEBUG] movie_id không hợp lệ: ${movie_id}`);
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

        // In truy vấn đang thực hiện
        console.log(`[DEBUG] Đang tìm reviews với movie_id: ${movie_id}`);
        
        const reviews = await Review.find({ movie_id })
            .populate('user_id')
            .populate('movie_id')
            .sort({ date: -1 }); // Sắp xếp theo ngày mới nhất

        // In kết quả tìm được
        console.log(`[DEBUG] Tìm thấy ${reviews.length} reviews cho phim ${movie_id}`);
        
        // Nếu có reviews, in thông tin chi tiết về review đầu tiên
        if (reviews.length > 0) {
            console.log(`[DEBUG] Chi tiết review đầu tiên: ${JSON.stringify(reviews[0])}`);
        }

        res.json(createResponse(200, null, reviews));
    } catch (error) {
        console.error('[ERROR] Get reviews by movie id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách đánh giá theo phim', null));
    }
};