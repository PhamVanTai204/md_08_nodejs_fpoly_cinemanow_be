const express = require('express');
const ShowTime = require('../models/showTime'); // Import model suất chiếu
const Film = require('../models/film'); // Import model phim
const Room = require('../models/room');
const createResponse = require('../utils/responseHelper');

// Lấy tất cả suất chiếu
exports.getAllShowTimes = async (req, res) => {
    try {
        const showTimes = await ShowTime.find()
            .populate('movie_id')
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });
        res.json(createResponse(200, null, showTimes));
    } catch (error) {
        console.error('Get all showtimes error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách suất chiếu', null));
    }
};

// Lấy chi tiết suất chiếu theo ID
exports.getShowTimeById = async (req, res) => {
    try {
        const showTime = await ShowTime.findById(req.params.id)
            .populate('movie_id')
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });

        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        res.json(createResponse(200, null, showTime));
    } catch (error) {
        console.error('Get showtime by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin suất chiếu', null));
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

        // Kiểm tra phim tồn tại
        const film = await Film.findById(movie_id);
        if (!film) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
        }

        // Kiểm tra phòng tồn tại
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng chiếu', null));
        }

        // Chuyển đổi định dạng ngày tháng
        const dateParts = show_date.split('/');
        if (dateParts.length !== 3) {
            return res.status(400).json(createResponse(400, 'Định dạng ngày tháng không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY', null));
        }
        const formattedDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
        
        // Kiểm tra ngày hợp lệ
        if (isNaN(formattedDate.getTime())) {
            return res.status(400).json(createResponse(400, 'Ngày tháng không hợp lệ', null));
        }

        // Kiểm tra thời gian hợp lệ
        if (end_time <= start_time) {
            return res.status(400).json(createResponse(400, 'Thời gian kết thúc phải sau thời gian bắt đầu', null));
        }

        // Kiểm tra trùng lịch chiếu
        const conflictShowTime = await ShowTime.findOne({
            room_id,
            show_date: formattedDate,
            $or: [
                {
                    start_time: { $lt: end_time },
                    end_time: { $gt: start_time }
                }
            ]
        });

        if (conflictShowTime) {
            return res.status(400).json(createResponse(400, 'Phòng đã có lịch chiếu trong khung giờ này', null));
        }

        const newShowTime = new ShowTime({
            showtime_id,
            movie_id,
            room_id,
            start_time,
            end_time,
            show_date: formattedDate
        });

        const savedShowTime = await newShowTime.save();
        
        // Populate thông tin liên quan
        const populatedShowTime = await ShowTime.findById(savedShowTime._id)
            .populate('movie_id')
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });

        res.status(201).json(createResponse(201, 'Tạo suất chiếu thành công', populatedShowTime));
    } catch (error) {
        console.error('Create showtime error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo suất chiếu', null));
    }
};

// Cập nhật suất chiếu
exports.updateShowTime = async (req, res) => {
    try {
        const { movie_id, room_id, start_time, end_time, show_date } = req.body;
        const id = req.params.id;

        // Kiểm tra suất chiếu tồn tại
        const showTime = await ShowTime.findById(id);
        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        // Kiểm tra phim tồn tại nếu cập nhật
        if (movie_id) {
            const film = await Film.findById(movie_id);
            if (!film) {
                return res.status(404).json(createResponse(404, 'Không tìm thấy phim', null));
            }
        }

        // Kiểm tra phòng tồn tại nếu cập nhật
        if (room_id) {
            const room = await Room.findById(room_id);
            if (!room) {
                return res.status(404).json(createResponse(404, 'Không tìm thấy phòng chiếu', null));
            }
        }

        // Xử lý ngày tháng nếu có cập nhật
        let formattedDate = showTime.show_date;
        if (show_date) {
            const dateParts = show_date.split('/');
            if (dateParts.length !== 3) {
                return res.status(400).json(createResponse(400, 'Định dạng ngày tháng không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY', null));
            }
            formattedDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
            
            // Kiểm tra ngày hợp lệ
            if (isNaN(formattedDate.getTime())) {
                return res.status(400).json(createResponse(400, 'Ngày tháng không hợp lệ', null));
            }
        }

        // Kiểm tra thời gian hợp lệ nếu cập nhật
        const newStartTime = start_time || showTime.start_time;
        const newEndTime = end_time || showTime.end_time;
        if (newEndTime <= newStartTime) {
            return res.status(400).json(createResponse(400, 'Thời gian kết thúc phải sau thời gian bắt đầu', null));
        }

        // Kiểm tra trùng lịch nếu có thay đổi phòng hoặc thời gian
        if (room_id || start_time || end_time || show_date) {
            const conflictShowTime = await ShowTime.findOne({
                _id: { $ne: id },
                room_id: room_id || showTime.room_id,
                show_date: formattedDate,
                $or: [
                    {
                        start_time: { $lt: newEndTime },
                        end_time: { $gt: newStartTime }
                    }
                ]
            });

            if (conflictShowTime) {
                return res.status(400).json(createResponse(400, 'Phòng đã có lịch chiếu trong khung giờ này', null));
            }
        }

        // Cập nhật thông tin (không cập nhật showtime_id)
        if (movie_id) showTime.movie_id = movie_id;
        if (room_id) showTime.room_id = room_id;
        if (start_time) showTime.start_time = start_time;
        if (end_time) showTime.end_time = end_time;
        if (show_date) showTime.show_date = formattedDate;

        const updatedShowTime = await showTime.save();
        
        // Populate thông tin liên quan
        const populatedShowTime = await ShowTime.findById(updatedShowTime._id)
            .populate('movie_id')
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });

        res.json(createResponse(200, 'Cập nhật suất chiếu thành công', populatedShowTime));
    } catch (error) {
        console.error('Update showtime error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật suất chiếu', null));
    }
};

// Xóa suất chiếu
exports.deleteShowTime = async (req, res) => {
    try {
        const showTime = await ShowTime.findById(req.params.id);
        if (!showTime) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy suất chiếu', null));
        }

        await ShowTime.deleteOne({ _id: req.params.id });
        res.json(createResponse(200, 'Xóa suất chiếu thành công', null));
    } catch (error) {
        console.error('Delete showtime error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa suất chiếu', null));
    }
};