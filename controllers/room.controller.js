const express = require('express');
const Room = require('../models/room');
const Cinema = require('../models/cinema');
const createResponse = require('../utils/responseHelper');

// Middleware kiểm tra ID hợp lệ
const validateId = (req, res, next) => {
    if (!req.params.id) {
        return res.status(400).json(createResponse(400, 'Thiếu ID phòng', null));
    }
    next();
};

// Lấy danh sách phòng chiếu
exports.getRooms = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy danh sách phòng chiếu với phân trang
        const rooms = await Room.find()
            .populate('cinema_id')
            .skip(skip)
            .limit(limit);

        // Đếm tổng số phòng chiếu
        const totalRooms = await Room.countDocuments();
        const totalPages = Math.ceil(totalRooms / limit);

        res.status(200).json(createResponse(200, null, {
            rooms,
            totalRooms,
            totalPages,
            currentPage: page,
            pageSize: limit
        }));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách phòng chiếu', error.message));
    }
};

// Lấy phòng chiếu theo ID
exports.getRoomById = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id).populate('cinema_id');
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng chiếu', null));
        }
        res.status(200).json(createResponse(200, null, room));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin phòng chiếu', error.message));
    }
};

// Thêm phòng chiếu mới
exports.addRoom = async (req, res) => {
    try {
        const { cinema_id, room_name, room_status } = req.body;

        // Kiểm tra thông tin bắt buộc
        if (!cinema_id || !room_name || room_status === undefined) {
            return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
        }

        // Kiểm tra rạp chiếu tồn tại
        const cinema = await Cinema.findById(cinema_id);
        if (!cinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp chiếu', null));
        }

        // Tạo phòng chiếu mới
        const newRoom = new Room({
            cinema_id,
            room_name,
            room_status
        });

        await newRoom.save();
        res.status(201).json(createResponse(201, 'Thêm phòng chiếu thành công', newRoom));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm phòng chiếu', error.message));
    }
};

// Cập nhật phòng chiếu
exports.updateRoom = async (req, res) => {
    try {
        const { room_name, room_status } = req.body;
        const roomId = req.params.id;

        // Kiểm tra phòng chiếu tồn tại
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng chiếu', null));
        }

        // Cập nhật thông tin
        const updatedRoom = await Room.findByIdAndUpdate(
            roomId,
            { room_name, room_status },
            { new: true, runValidators: true }
        ).populate('cinema_id');

        res.status(200).json(createResponse(200, 'Cập nhật phòng chiếu thành công', updatedRoom));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật phòng chiếu', error.message));
    }
};

// Xóa phòng chiếu
exports.deleteRoom = async (req, res) => {
    try {
        const roomId = req.params.id;

        // Kiểm tra phòng chiếu tồn tại
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng chiếu', null));
        }

        // Xóa phòng chiếu
        await Room.findByIdAndDelete(roomId);
        res.status(200).json(createResponse(200, 'Xóa phòng chiếu thành công', null));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa phòng chiếu', error.message));
    }
};

//Lấy các phòng thuộc 1 cinema
exports.getRoomsByCinema = async (req, res) => {
    try {
        const { cinemaId } = req.params;
        const rooms = await Room.find({ cinema_id: cinemaId });
        if (rooms.length === 0) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng nào thuộc rạp này', null));
        }
        res.status(200).json(createResponse(200, null, rooms));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy phòng theo rạp', error.message));
    }
}