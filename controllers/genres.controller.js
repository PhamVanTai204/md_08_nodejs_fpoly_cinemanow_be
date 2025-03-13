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
