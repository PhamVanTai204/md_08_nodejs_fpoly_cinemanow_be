const express = require('express');
const Genres = require('../models/genres'); // Import model Genres
const createResponse = require('../utils/responseHelper');

// Tạo thể loại mới
exports.createGenre = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json(createResponse(400, 'Tên thể loại là bắt buộc', null));
    }

    try {
        // Kiểm tra xem thể loại đã tồn tại chưa
        const existingGenre = await Genres.findOne({ name });
        if (existingGenre) {
            return res.status(409).json(createResponse(409, 'Thể loại đã tồn tại', null));
        }

        const genre = new Genres({ name });
        await genre.save();
        res.status(201).json(createResponse(201, null, 'Thể loại được tạo thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi server', error.message));
    }
};
// Lấy danh sách thể loại
exports.getAllGenres = async (req, res) => {
    try {
        const genres = await Genres.find();
        res.json(createResponse(200, null, genres));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi server', error.message));
    }
};


// Lấy thể loại theo ID
exports.getGenreById = async (req, res) => {
    try {
        const { id } = req.params;
        const genre = await Genres.findById(id);
        if (!genre) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thể loại', null));
        }
        res.json(createResponse(200, null, genre));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi server', error.message));
    }
};
// Cập nhật thể loại

exports.updateGenre = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json(createResponse(400, 'Tên thể loại là bắt buộc', null));
        }

        const updatedGenre = await Genres.findByIdAndUpdate(id, { name }, { new: true });
        if (!updatedGenre) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thể loại', null));
        }
        res.json(createResponse(200, null, 'Cập nhật thể loại thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi server', error.message));
    }
};


// Xóa thể loại
exports.deleteGenre = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedGenre = await Genres.findByIdAndDelete(id);
        if (!deletedGenre) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thể loại', null));
        }
        res.json(createResponse(200, null, 'Xóa thể loại thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi server', error.message));
    }
};