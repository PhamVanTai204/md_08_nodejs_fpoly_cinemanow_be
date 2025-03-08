const express = require('express');
const ShowTime = require('../models/showTime'); // Import model suất chiếu
const Film = require('../models/film'); // Import model phim
const createResponse = require('../utils/responseHelper');

// Lấy danh sách suất chiếu
exports.getShowTimes = async (req, res) => {
    try {
        const showTimes = await ShowTime.find(); // Lấy thông tin phim kèm theo
        res.status(200).json(createResponse(200, null, showTimes));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu', error.message));
    }
};


// Lấy suất chiếu theo ID
exports.getShowTimeById = async (req, res) => {
    try {
        const showTime = await ShowTime.findById(req.params.id).populate('movieId');
        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }
        res.status(200).json(createResponse(200, null, showTime));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy suất chiếu', error.message));
    }
};

// Thêm suất chiếu mới
exports.addShowTime = async (req, res) => {
    const { movieId, statusShowTime, startTime, endTime, price } = req.body;

    if (!movieId || !startTime || !endTime || !price) {
        return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
    }

    try {
        // Kiểm tra xem phim có tồn tại không
        const film = await Film.findById(movieId);
        if (!film) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }

        const showTime = new ShowTime({
            movieId,
            statusShowTime,
            startTime,
            endTime,
            price
        });

        await showTime.save();
        res.status(201).json(createResponse(201, null, 'Thêm suất chiếu thành công'));
    } catch (error) {
        const statusCode = error.name === 'ValidationError' ? 400 : 500;
        res.status(statusCode).json(createResponse(statusCode, 'Lỗi khi thêm suất chiếu', error.message));
    }
};

// Cập nhật suất chiếu
exports.updateShowTime = async (req, res) => {
    const { id } = req.params;
    const { movieId, statusShowTime, startTime, endTime, price } = req.body;

    // Kiểm tra nếu ID không hợp lệ
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
    }

    try {
        // Kiểm tra suất chiếu có tồn tại không
        const existingShowTime = await ShowTime.findById(id);
        if (!existingShowTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        // Cập nhật suất chiếu
        existingShowTime.movieId = movieId || existingShowTime.movieId;
        existingShowTime.statusShowTime = statusShowTime !== undefined ? statusShowTime : existingShowTime.statusShowTime;
        existingShowTime.startTime = startTime || existingShowTime.startTime;
        existingShowTime.endTime = endTime || existingShowTime.endTime;
        existingShowTime.price = price !== undefined ? price : existingShowTime.price;

        await existingShowTime.save();

        res.status(200).json(createResponse(200, null, 'Cập nhật suất chiếu thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật suất chiếu', error.message));
    }
};


// Xóa suất chiếu
exports.deleteShowTime = async (req, res) => {
    try {
        const deletedShowTime = await ShowTime.findByIdAndDelete(req.params.id);
        if (!deletedShowTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        res.status(200).json(createResponse(200, null, 'Xóa suất chiếu thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa suất chiếu', error.message));
    }
};