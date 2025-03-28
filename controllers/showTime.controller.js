const express = require('express');
const ShowTime = require('../models/showTime'); // Import model suất chiếu
const Film = require('../models/film'); // Import model phim
const Room = require('../models/room');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');
const Cinema = require('../models/cinema');

// Lấy tất cả suất chiếu
exports.getAllShowTimes = async (req, res) => {
    try {
        const showTimes = await ShowTime.find()
            .populate('movie_id')
            .populate('room_id');
        res.json(createResponse(200, null, showTimes));
    } catch (error) {
        console.error('Get all show times error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu', null));
    }
};

// Lấy suất chiếu theo ID
exports.getShowTimeById = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        const showTime = await ShowTime.findById(id)
            .populate('movie_id')
            .populate('room_id');

        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        res.json(createResponse(200, null, showTime));
    } catch (error) {
        console.error('Get show time by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin suất chiếu', null));
    }
};

// API Mobile - Lấy suất chiếu theo ID phim
exports.getShowTimesByMovieId = async (req, res) => {
    try {
        const movie_id = req.params.movie_id;

        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

        const showTimes = await ShowTime.find({ movie_id })
            .populate('movie_id')
            .populate('room_id')
            .sort({ start_time: 1 }); // Sắp xếp theo thời gian bắt đầu

        if (!showTimes.length) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu cho phim này', null));
        }

        res.json(createResponse(200, null, showTimes));
    } catch (error) {
        console.error('Get show times by movie id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu theo phim', null));
    }
};

// Tạo suất chiếu mới
exports.createShowTime = async (req, res) => {
    try {
        const { showtime_id, movie_id, room_id, start_time, end_time, show_date } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!showtime_id || !movie_id || !room_id || !start_time || !end_time || !show_date) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra showtime_id đã tồn tại
        const existingShowTime = await ShowTime.findOne({ showtime_id });
        if (existingShowTime) {
            return res.status(400).json(createResponse(400, 'Mã suất chiếu đã tồn tại', null));
        }

        // Chuyển đổi định dạng ngày DD/MM/YYYY thành YYYY-MM-DD
        let formattedDate;
        try {
            const [day, month, year] = show_date.split('/');
            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            
            // Kiểm tra ngày hợp lệ
            if (!isValidDate(formattedDate)) {
                return res.status(400).json(createResponse(400, 'Ngày tháng không hợp lệ', null));
            }
        } catch (error) {
            return res.status(400).json(createResponse(400, 'Định dạng ngày tháng không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY', null));
        }

        // Kiểm tra movie_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

        // Kiểm tra room_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(room_id)) {
            return res.status(400).json(createResponse(400, 'ID phòng chiếu không hợp lệ', null));
        }

        const newShowTime = new ShowTime({
            showtime_id,
            movie_id,
            room_id,
            start_time,
            end_time,
            show_date: formattedDate // Sử dụng ngày đã được format
        });

        const savedShowTime = await newShowTime.save();
        const populatedShowTime = await ShowTime.findById(savedShowTime._id)
            .populate('movie_id')
            .populate('room_id');

        res.status(201).json(createResponse(201, 'Tạo suất chiếu thành công', populatedShowTime));
    } catch (error) {
        console.error('Create show time error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo suất chiếu', null));
    }
};

// Hàm kiểm tra ngày hợp lệ
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Cập nhật suất chiếu
exports.updateShowTime = async (req, res) => {
    try {
        const { start_time, end_time, show_date } = req.body;
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        const showTime = await ShowTime.findById(id);
        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        if (start_time) showTime.start_time = start_time;
        if (end_time) showTime.end_time = end_time;
        if (show_date) showTime.show_date = show_date;

        const updatedShowTime = await showTime.save();
        const populatedShowTime = await ShowTime.findById(updatedShowTime._id)
            .populate('movie_id')
            .populate('room_id');

        res.json(createResponse(200, 'Cập nhật suất chiếu thành công', populatedShowTime));
    } catch (error) {
        console.error('Update show time error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật suất chiếu', null));
    }
};

// Xóa suất chiếu
exports.deleteShowTime = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        const showTime = await ShowTime.findById(id);
        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        await ShowTime.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa suất chiếu thành công', null));
    } catch (error) {
        console.error('Delete show time error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa suất chiếu', null));
    }
};

// API Mobile - Lấy suất chiếu theo phim và location
exports.getShowTimesByMovieLocation = async (req, res) => {
    try {
        const movie_id = req.params.movie_id;
        const { location } = req.query;

        if (!mongoose.Types.ObjectId.isValid(movie_id)) {
            return res.status(400).json(createResponse(400, 'ID phim không hợp lệ', null));
        }

        // Lấy danh sách rạp theo location
        const cinemas = await Cinema.find({ location });
        if (!cinemas.length) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp tại địa điểm này', null));
        }

        const cinemaIds = cinemas.map(cinema => cinema._id);

        // Lấy danh sách phòng của các rạp
        const rooms = await Room.find({ cinema_id: { $in: cinemaIds } });
        const roomIds = rooms.map(room => room._id);

        // Lấy suất chiếu theo phim và phòng
        const showTimes = await ShowTime.find({
            movie_id,
            room_id: { $in: roomIds }
        })
        .populate('movie_id')
        .populate({
            path: 'room_id',
            populate: {
                path: 'cinema_id'
            }
        })
        .sort({ start_time: 1 });

        if (!showTimes.length) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu tại địa điểm này', null));
        }

        // Nhóm suất chiếu theo rạp
        const result = cinemas.map(cinema => ({
            cinema_id: cinema._id,
            cinema_name: cinema.name,
            cinema_address: cinema.address,
            showtimes: showTimes.filter(
                showtime => showtime.room_id.cinema_id._id.toString() === cinema._id.toString()
            )
        })).filter(item => item.showtimes.length > 0);

        res.json(createResponse(200, null, result));
    } catch (error) {
        console.error('Get show times by location error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu', null));
    }
};