const express = require('express');
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

// Lấy danh sách rạp chiếu
exports.getCinemas = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy danh sách rạp chiếu với phân trang
        const cinemas = await Cinema.find()
            .skip(skip)
            .limit(limit);

        // Đếm tổng số rạp chiếu
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
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách rạp chiếu', error.message));
    }
};

// Lấy rạp chiếu theo ID
exports.getCinemaById = async (req, res) => {
    try {
        const cinema = await Cinema.findById(req.params.id);
        if (!cinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp chiếu', null));
        }
        res.status(200).json(createResponse(200, null, cinema));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin rạp chiếu', error.message));
    }
};

// Thêm rạp chiếu mới
exports.addCinema = async (req, res) => {
    try {
        const { cinema_name, location } = req.body;

        // Kiểm tra thông tin bắt buộc
        if (!cinema_name || !location) {
            return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
        }

        // Tạo rạp chiếu mới
        const newCinema = new Cinema({
            cinema_name,
            location
        });

        await newCinema.save();
        res.status(201).json(createResponse(201, 'Thêm rạp chiếu thành công', newCinema));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm rạp chiếu', error.message));
    }
};

// Cập nhật rạp chiếu
exports.updateCinema = async (req, res) => {
    try {
        const { cinema_name, location } = req.body;
        const cinemaId = req.params.id;

        // Kiểm tra rạp chiếu tồn tại
        const cinema = await Cinema.findById(cinemaId);
        if (!cinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp chiếu', null));
        }

        // Cập nhật thông tin
        const updatedCinema = await Cinema.findByIdAndUpdate(
            cinemaId,
            { cinema_name, location },
            { new: true, runValidators: true }
        );

        res.status(200).json(createResponse(200, 'Cập nhật rạp chiếu thành công', updatedCinema));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật rạp chiếu', error.message));
    }
};

// Xóa rạp chiếu
exports.deleteCinema = async (req, res) => {
    try {
        const cinemaId = req.params.id;

        // Kiểm tra rạp chiếu tồn tại
        const cinema = await Cinema.findById(cinemaId);
        if (!cinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp chiếu', null));
        }

        // Xóa rạp chiếu
        await Cinema.findByIdAndDelete(cinemaId);
        res.status(200).json(createResponse(200, 'Xóa rạp chiếu thành công', null));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa rạp chiếu', error.message));
    }
};