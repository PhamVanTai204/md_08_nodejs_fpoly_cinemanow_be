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


// Lấy chi tiết suất chiếu theo ID
exports.getShowTimeById = async (req, res) => {
    try {
        console.log('Searching for showtime with ID:', req.params.id);
        
        // Tìm suất chiếu theo showtime_id
        const showTime = await ShowTime.findOne({ showtime_id: req.params.id })
            .populate('movie_id') // Lấy thông tin phim
            .populate('room_id'); // Lấy thông tin phòng

        console.log('Found showtime:', showTime);

        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu với ID này', null));
        }

        res.status(200).json(createResponse(200, null, showTime));
    } catch (error) {
        console.error('Error in getShowTimeById:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin suất chiếu', error.message));
    }
};

// Thêm suất chiếu mới
exports.addShowTime = async (req, res) => {
    const { movie_id, start_time, date, room_id } = req.body;

    if (!movie_id || !start_time || !date || !room_id) {
        return res.status(400).json(createResponse(400, 'Vui lòng nhập đầy đủ: movie_id, start_time, date, room_id', null));
    }

    try {
        // Tạo suất chiếu mới
        const showTime = new ShowTime({
            showtime_id: `ST${Date.now()}`,
            movie_id,
            date,
            start_time,
            room_id,
            status: 1 // Mặc định là sắp chiếu
        });

        // Lưu suất chiếu
        await showTime.save();

        res.status(201).json(createResponse(201, null, 'Thêm suất chiếu thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm suất chiếu', error.message));
    }
};

// Cập nhật suất chiếu
exports.updateShowTime = async (req, res) => {
    const { id } = req.params;
    const { movie_id, showtime_status, start_time, end_time, date, room_id } = req.body;

    try {
        // Kiểm tra suất chiếu có tồn tại không
        const existingShowTime = await ShowTime.findOne({ showtime_id: id });
        if (!existingShowTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        // Cập nhật suất chiếu
        if (movie_id) existingShowTime.movie_id = movie_id;
        if (showtime_status !== undefined) existingShowTime.status = showtime_status;
        if (start_time) existingShowTime.start_time = start_time;
        if (end_time) existingShowTime.end_time = end_time;
        if (date) existingShowTime.date = date;
        if (room_id) existingShowTime.room_id = room_id;

        // Lưu suất chiếu đã cập nhật
        const updatedShowTime = await existingShowTime.save();

        // Trả về suất chiếu đã cập nhật
        res.status(200).json(createResponse(200, null, updatedShowTime));
    } catch (error) {
        console.error('Error updating showtime:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật suất chiếu', error.message));
    }
};

// Xóa suất chiếu
exports.deleteShowTime = async (req, res) => {
    try {
        const deletedShowTime = await ShowTime.findOneAndDelete({ showtime_id: req.params.id });
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