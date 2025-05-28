const Review = require('../models/review');
const User = require('../models/user');
const Film = require('../models/film');
const Report = require('../models/report');
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


// Xử lý báo cáo bình luận (CẬP NHẬT)
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

        // Tạo report_id unique
        const report_id = `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Tạo báo cáo mới
        const newReport = new Report({
            report_id,
            reporter_id: reporterId,
            reported_user_id: reportedUserId,
            review_id,
            comment,
            reason,
            status: 'pending'
        });

        // Lưu báo cáo vào database
        const savedReport = await newReport.save();

        // Cập nhật status của review thành 'reported'
        await Review.findByIdAndUpdate(review_id, { status_review: 'reported' });

        // Ghi thông tin báo cáo vào console
        console.log('===== BÁO CÁO BÌNH LUẬN =====');
        console.log('Report ID:', report_id);
        console.log('Reporter ID:', reporterId);
        console.log('Reported User ID:', reportedUserId);
        console.log('Review ID:', review_id);
        console.log('Comment:', comment);
        console.log('Reason:', reason);
        console.log('Time:', new Date().toISOString());
        console.log('==============================');

        res.status(201).json(createResponse(201, 'Báo cáo đã được gửi thành công', {
            reportId: report_id,
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
// ANCHOR: Lấy bình luận bị báo cáo theo phim
exports.getReportedCommentsByMovie = async (req, res) => {
    try {
        const movie_id = req.params.movie_id;

        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

        // Tìm tất cả review bị reported của phim này
        const reportedReviews = await Review.find({
            movie_id: movie_id,
            status_review: 'reported'
        }).populate('user_id', 'username avatar')
            .populate('movie_id', 'title poster');

        // Lấy ID các review đã bị reported
        const reviewIds = reportedReviews.map(r => r._id);

        // Tìm tất cả report liên quan đến các review này
        const reports = await Report.find({
            review_id: { $in: reviewIds },
            status: 'pending'
        }).sort({ created_at: -1 });

        // Kết hợp thông tin
        const result = reportedReviews.map(review => {
            const relatedReports = reports.filter(r => r.review_id.equals(review._id));
            return {
                review: review,
            };
        });

        res.json(createResponse(200, null, result));
    } catch (error) {
        console.error('Get reported comments by movie error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách bình luận bị báo cáo', null));
    }
};

