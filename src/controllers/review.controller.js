const Review = require("../models/review");
const User = require("../models/user");
const Film = require("../models/film");
const Report = require("../models/reports");
const createResponse = require("../utils/responseHelper");
const mongoose = require("mongoose");

// Lấy tất cả review
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user_id")
      .populate("movie_id")
      .sort({ date: -1 }); // Sắp xếp theo ngày mới nhất
    res.json(createResponse(200, null, reviews));
  } catch (error) {
    console.error("Get all reviews error:", error);
    res
      .status(500)
      .json(createResponse(500, "Lỗi khi lấy danh sách đánh giá", null));
  }
};

// Lấy review theo ID
exports.getReviewById = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(createResponse(400, "ID đánh giá không hợp lệ", null));
    }

    const review = await Review.findById(id)
      .populate("user_id")
      .populate("movie_id");

    if (!review) {
      return res
        .status(404)
        .json(createResponse(404, "Không tìm thấy đánh giá", null));
    }

    res.json(createResponse(200, null, review));
  } catch (error) {
    console.error("Get review by id error:", error);
    res
      .status(500)
      .json(createResponse(500, "Lỗi khi lấy thông tin đánh giá", null));
  }
};

// Lấy reviews theo movie_id
exports.getReviewsByMovieId = async (req, res) => {
  try {
    const movie_id = req.params.movie_id;

    if (!mongoose.Types.ObjectId.isValid(movie_id)) {
      return res
        .status(400)
        .json(createResponse(400, "ID phim không hợp lệ", null));
    }

    const reviews = await Review.find({ movie_id })
      .populate("user_id")
      .populate("movie_id")
      .sort({ date: -1 }); // Sắp xếp theo ngày mới nhất

    res.json(createResponse(200, null, reviews));
  } catch (error) {
    console.error("Get reviews by movie id error:", error);
    res
      .status(500)
      .json(
        createResponse(500, "Lỗi khi lấy danh sách đánh giá theo phim", null)
      );
  }
};

// Tạo review mới
exports.createReview = async (req, res) => {
  try {
    const { review_id, user_id, movie_id, comment } = req.body;

    // Kiểm tra đầy đủ thông tin
    if (!review_id || !user_id || !movie_id || !comment) {
      return res
        .status(400)
        .json(createResponse(400, "Vui lòng cung cấp đầy đủ thông tin", null));
    }

    // Kiểm tra review_id đã tồn tại
    const existingReview = await Review.findOne({ review_id });
    if (existingReview) {
      return res
        .status(400)
        .json(createResponse(400, "Mã đánh giá đã tồn tại", null));
    }

    // Kiểm tra user tồn tại
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res
        .status(400)
        .json(createResponse(400, "ID người dùng không hợp lệ", null));
    }
    const user = await User.findById(user_id);
    if (!user) {
      return res
        .status(404)
        .json(createResponse(404, "Không tìm thấy người dùng", null));
    }

    // Kiểm tra movie tồn tại
    if (!mongoose.Types.ObjectId.isValid(movie_id)) {
      return res
        .status(400)
        .json(createResponse(400, "ID phim không hợp lệ", null));
    }
    const movie = await Film.findById(movie_id);
    if (!movie) {
      return res
        .status(404)
        .json(createResponse(404, "Không tìm thấy phim", null));
    }

    const newReview = new Review({
      review_id,
      user_id,
      movie_id,
      comment,
      date: new Date(),
    });

    const savedReview = await newReview.save();
    const populatedReview = await Review.findById(savedReview._id)
      .populate("user_id")
      .populate("movie_id");

    res
      .status(201)
      .json(createResponse(201, "Tạo đánh giá thành công", populatedReview));
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json(createResponse(500, "Lỗi khi tạo đánh giá", null));
  }
};

// Cập nhật review
exports.updateReview = async (req, res) => {
  try {
    const { comment } = req.body;
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(createResponse(400, "ID đánh giá không hợp lệ", null));
    }

    const review = await Review.findById(id);
    if (!review) {
      return res
        .status(404)
        .json(createResponse(404, "Không tìm thấy đánh giá", null));
    }

    if (comment) {
      review.comment = comment;
      review.date = new Date(); // Cập nhật ngày khi sửa comment
    }

    const updatedReview = await review.save();
    const populatedReview = await Review.findById(updatedReview._id)
      .populate("user_id")
      .populate("movie_id");

    res.json(
      createResponse(200, "Cập nhật đánh giá thành công", populatedReview)
    );
  } catch (error) {
    console.error("Update review error:", error);
    res
      .status(500)
      .json(createResponse(500, "Lỗi khi cập nhật đánh giá", null));
  }
};

// Xóa review
exports.deleteReview = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(createResponse(400, "ID đánh giá không hợp lệ", null));
    }

    const review = await Review.findById(id);
    if (!review) {
      return res
        .status(404)
        .json(createResponse(404, "Không tìm thấy đánh giá", null));
    }

    await Review.deleteOne({ _id: id });
    res.json(createResponse(200, "Xóa đánh giá thành công", null));
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json(createResponse(500, "Lỗi khi xóa đánh giá", null));
  }
};

// Báo cáo bình luận
exports.reportComment = async (req, res) => {
  try {
    const { review_id, reporterId, reportedUserId, comment, reason } = req.body;

    if (!review_id || !reporterId || !reportedUserId || !comment || !reason) {
      return res
        .status(400)
        .json(createResponse(400, "Thiếu dữ liệu bắt buộc", null));
    }

    if (
      !mongoose.Types.ObjectId.isValid(reporterId) ||
      !mongoose.Types.ObjectId.isValid(reportedUserId)
    ) {
      return res.status(400).json(createResponse(400, "ID không hợp lệ", null));
    }

    if (reporterId === reportedUserId) {
      return res
        .status(400)
        .json(createResponse(400, "Không thể báo cáo chính mình", null));
    }

    await new Report({
      review_id,
      reporterId,
      reportedUserId,
      comment,
      reason,
    }).save();

    res.status(201).json(createResponse(201, "Báo cáo thành công", null));
  } catch (error) {
    console.error("Report comment error:", error);
    res
      .status(500)
      .json(createResponse(500, "Lỗi khi báo cáo bình luận", null));
  }
};

// Lấy tất cả báo cáo không lấy thông tin
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reportedUserId', 'fullName email') // Lấy thông tin người bị báo cáo
      .sort({ reportedAt: -1 });

    const simplified = reports.map(report => ({
      id: report._id,
      review_id: report.review_id,
    //   reportedUserName: report.reportedUserId?.fullName || 'Không rõ',
      reportedUserEmail: report.reportedUserId?.email || 'Không rõ',
      comment: report.comment,
      reason: report.reason,
      reportedAt: report.reportedAt
    }));

    res.json(createResponse(200, null, simplified));
  } catch (error) {
    console.error("Get all reports error:", error);
    res
      .status(500)
      .json(createResponse(500, "Lỗi khi lấy danh sách báo cáo", null));
  }
};



