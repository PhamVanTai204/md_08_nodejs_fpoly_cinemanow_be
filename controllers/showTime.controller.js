const express = require('express');
const ShowTime = require('../models/showTime'); // Import model suất chiếu
const Film = require('../models/film'); // Import model phim
const createResponse = require('../utils/responseHelper');

// Lấy danh sách suất chiếu
exports.getShowTimes = async (req, res) => {
    try {
        const showTimes = await ShowTime.find().populate('movie_id'); // Lấy thông tin phim kèm theo
        res.status(200).json(createResponse(200, null, showTimes));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu', error.message));
    }
};


// Lấy suất chiếu theo ID
exports.getShowTimeById = async (req, res) => {
    try {
        const showTime = await ShowTime.findById(req.params.id).populate('movie_id');
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
    const { movie_id, showtime_status, start_time, end_time, date, room_id } = req.body;

    if (!movie_id || !start_time || !end_time || !date || !room_id) {
        return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
    }

    try {
        // Tạo suất chiếu mới
        const showTime = new ShowTime({
            showtime_id: `ST${Date.now()}`, // Tạo mã suất chiếu tự động
            movie_id,
            date,
            start_time,
            end_time,
            room_id,
            status: showtime_status || 1 // Mặc định là sắp chiếu
        });

        // Lưu suất chiếu
        const savedShowTime = await showTime.save();

        // Sau khi lưu suất chiếu thành công, cập nhật vào film
        await Film.findByIdAndUpdate(
            movie_id,
            { $push: { showtimes: savedShowTime._id } }
        );

        res.status(201).json(createResponse(201, null, 'Thêm suất chiếu thành công'));
    } catch (error) {
        const statusCode = error.name === 'ValidationError' ? 400 : 500;
        res.status(statusCode).json(createResponse(statusCode, 'Lỗi khi thêm suất chiếu', error.message));
    }
};

// Cập nhật suất chiếu
exports.updateShowTime = async (req, res) => {
    const { id } = req.params;
    const { movie_id, showtime_status, start_time, end_time, price } = req.body;

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
        existingShowTime.movie_id = movie_id || existingShowTime.movie_id;
        existingShowTime.showtime_status = showtime_status !== undefined ? showtime_status : existingShowTime.showtime_status;
        existingShowTime.start_time = start_time || existingShowTime.start_time;
        existingShowTime.end_time = end_time || existingShowTime.end_time;
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

// Lấy danh sách phim có suất chiếu
exports.getFilmsWithShowTimes = async (req, res) => {
    try {
        // Lấy tất cả suất chiếu và populate thông tin phim
        const showTimes = await ShowTime.find()
            .populate('movie_id')
            .populate('room_id');

        // Nhóm suất chiếu theo phim
        const filmsWithShowtimes = showTimes.reduce((acc, showtime) => {
            const film = showtime.movie_id;
            // Kiểm tra xem film có tồn tại không
            if (!film) return acc;
            
            if (!acc[film._id]) {
                acc[film._id] = {
                    ...film.toObject(),
                    showtimes: []
                };
            }
            acc[film._id].showtimes.push({
                showtime_id: showtime.showtime_id,
                date: showtime.date,
                start_time: showtime.start_time,
                room_id: showtime.room_id,
                status: showtime.status
            });
            return acc;
        }, {});

        res.status(200).json(createResponse(200, null, Object.values(filmsWithShowtimes)));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách phim có suất chiếu', error.message));
    }
};