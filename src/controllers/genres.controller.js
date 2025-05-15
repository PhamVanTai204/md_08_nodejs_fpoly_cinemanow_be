const express = require('express');
const Genres = require('../models/genres'); // Import model Genres
const createResponse = require('../utils/responseHelper');

// SECTION: API quản lý thể loại phim

// ANCHOR: Tạo thể loại mới
exports.createGenre = async (req, res) => {
    const { name } = req.body;

    // IMPORTANT: Kiểm tra dữ liệu đầu vào bắt buộc
    if (!name) {
        return res.status(400).json(createResponse(400, 'Tên thể loại là bắt buộc', null));
    }

    try {
        // WARNING: Kiểm tra xem thể loại đã tồn tại chưa
        const existingGenre = await Genres.findOne({ name });
        if (existingGenre) {
            return res.status(409).json(createResponse(409, 'Thể loại đã tồn tại', null));
        }

        // NOTE: Tạo đối tượng thể loại mới
        const genre = new Genres({ name });
        
        // DONE: Lưu thể loại vào cơ sở dữ liệu
        await genre.save();
        res.status(201).json(createResponse(201, null, 'Thể loại được tạo thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi server', error.message));
    }
};

// ANCHOR: Lấy danh sách tất cả thể loại
exports.getAllGenres = async (req, res) => {
    try {
        // NOTE: Truy vấn tất cả thể loại
        const genres = await Genres.find();
        res.json(createResponse(200, null, genres));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi server', error.message));
    }
};

// ANCHOR: Lấy thể loại theo ID
exports.getGenreById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // NOTE: Tìm thể loại theo ID
        const genre = await Genres.findById(id);
        
        // WARNING: Kiểm tra nếu không tìm thấy thể loại
        if (!genre) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thể loại', null));
        }
        
        res.json(createResponse(200, null, genre));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi server', error.message));
    }
};

// ANCHOR: Cập nhật thể loại
exports.updateGenre = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // IMPORTANT: Kiểm tra dữ liệu đầu vào bắt buộc
        if (!name) {
            return res.status(400).json(createResponse(400, 'Tên thể loại là bắt buộc', null));
        }

        // NOTE: Cập nhật thể loại và trả về thể loại đã cập nhật
        const updatedGenre = await Genres.findByIdAndUpdate(id, { name }, { new: true });
        
        // WARNING: Kiểm tra nếu không tìm thấy thể loại
        if (!updatedGenre) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thể loại', null));
        }
        
        res.json(createResponse(200, null, 'Cập nhật thể loại thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi server', error.message));
    }
};

// ANCHOR: Xóa thể loại
exports.deleteGenre = async (req, res) => {
    try {
        const { id } = req.params;
        
        // NOTE: Tìm và xóa thể loại theo ID
        const deletedGenre = await Genres.findByIdAndDelete(id);
        
        // WARNING: Kiểm tra nếu không tìm thấy thể loại
        if (!deletedGenre) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thể loại', null));
        }
        
        res.json(createResponse(200, null, 'Xóa thể loại thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi server', error.message));
    }
};

// TODO: Thêm API lấy danh sách phim theo thể loại
// TODO: Thêm API thống kê phim theo thể loại
// IDEA: Thêm khả năng phân cấp thể loại (thể loại cha/con)
// OPTIMIZE: Cần thêm validation kỹ hơn cho tên thể loại