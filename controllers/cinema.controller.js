const Cinema = require('../models/cinema');
const createResponse = require('../utils/responseHelper');

// Middleware kiểm tra ID hợp lệ
const validateId = (req, res, next) => {
    if (!req.params.id) {
        return res.status(400).json(createResponse(400, 'Thiếu ID rạp phim', null));
    }
    next();
};

// Tìm kiếm rạp phim theo tên hoặc địa điểm
exports.searchCinema = async (req, res) => {
    try {
        const { query } = req.query;

        // Nếu không có query, trả về danh sách trống
        if (!query) {
            return res.status(400).json(createResponse(400, 'Vui lòng nhập tên hoặc địa điểm rạp phim để tìm kiếm', null));
        }

        // Tìm kiếm rạp phim theo tên hoặc địa điểm chứa từ khóa (không phân biệt hoa thường)
        const searchQuery = {
            $or: [
                { cinema_name: new RegExp(query, 'i') },
                { location: new RegExp(query, 'i') }
            ]
        };
        const cinemas = await Cinema.find(searchQuery);

        res.status(200).json(createResponse(200, null, cinemas));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi tìm kiếm rạp phim', error.message));
    }
};

// Lấy danh sách rạp phim
exports.getCinema = async (req, res) => {
    try {
        let { page, limit } = req.query;

        // Chuyển đổi giá trị thành số nguyên và đặt mặc định nếu không có giá trị
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy danh sách rạp phim với phân trang
        const cinemas = await Cinema.find()
            .skip(skip)
            .limit(limit);

        // Đếm tổng số rạp phim để tính tổng số trang
        const totalCinemas = await Cinema.countDocuments();
        const totalPages = Math.ceil(totalCinemas / limit);

        res.status(200).json(createResponse(200, null, {
            cinemas,
            totalCinemas,
            totalPages,
            currentPage: page,
            pageSize: limit
        }));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách rạp phim', error.message));
    }
};

// Lấy rạp phim theo ID
exports.getCinemaId = async (req, res) => {
    try {
        const cinema = await Cinema.findById(req.params.id);
        if (!cinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp phim', null));
        }
        res.status(200).json(createResponse(200, null, cinema));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy rạp phim', error.message));
    }
};

// Thêm rạp phim
exports.addCinema = async (req, res) => {
    const { cinema_name, location } = req.body;

    if (!cinema_name || !location) {
        return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
    }

    try {
        const cinema = new Cinema({
            cinema_name,
            location
        });

        await cinema.save();
        res.status(201).json(createResponse(201, null, 'Thêm rạp phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm rạp phim', error.message));
    }
};

// Cập nhật rạp phim
exports.updateCinema = async (req, res) => {
    try {
        const updatedCinema = await Cinema.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedCinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp phim', null));
        }

        res.status(200).json(createResponse(200, null, 'Cập nhật rạp phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật rạp phim', error.message));
    }
};

// Xóa rạp phim
exports.deleteCinema = async (req, res) => {
    try {
        const deletedCinema = await Cinema.findByIdAndDelete(req.params.id);
        if (!deletedCinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp phim', null));
        }

        res.status(200).json(createResponse(200, null, 'Xóa rạp phim thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa rạp phim', error.message));
    }
};