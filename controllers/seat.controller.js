const express = require('express');
const Seat = require('../models/seat');
const Room = require('../models/room');
const createResponse = require('../utils/responseHelper');

// Lấy danh sách ghế theo phòng chiếu
exports.getSeatsByRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Kiểm tra phòng chiếu tồn tại
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng chiếu', null));
        }

        // Lấy danh sách ghế với phân trang
        const seats = await Seat.find({ room_id: roomId })
            .skip(skip)
            .limit(limit);

        // Đếm tổng số ghế
        const totalSeats = await Seat.countDocuments({ room_id: roomId });
        const totalPages = Math.ceil(totalSeats / limit);

        res.status(200).json(createResponse(200, null, {
            seats,
            totalSeats,
            totalPages,
            currentPage: page,
            pageSize: limit
        }));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách ghế', error.message));
    }
};

// Lấy ghế theo ID
exports.getSeatById = async (req, res) => {
    try {
        const seat = await Seat.findById(req.params.id);
        if (!seat) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế', null));
        }
        res.status(200).json(createResponse(200, null, seat));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin ghế', error.message));
    }
};

// Thêm ghế mới
exports.addSeat = async (req, res) => {
    try {
        const { seat_id, room_id, type, price } = req.body;

        // Kiểm tra thông tin bắt buộc
        if (!seat_id || !room_id || !type || price === undefined) {
            return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
        }

        // Kiểm tra phòng chiếu tồn tại
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng chiếu', null));
        }

        // Kiểm tra seat_id đã tồn tại
        const existingSeat = await Seat.findOne({ seat_id });
        if (existingSeat) {
            return res.status(400).json(createResponse(400, 'Mã ghế đã tồn tại', null));
        }

        // Tạo ghế mới
        const newSeat = new Seat({
            seat_id,
            room_id,
            type,
            price
        });

        await newSeat.save();
        res.status(201).json(createResponse(201, 'Thêm ghế thành công', newSeat));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm ghế', error.message));
    }
};

// Cập nhật ghế
exports.updateSeat = async (req, res) => {
    try {
        const { type, price, is_available } = req.body;
        const seatId = req.params.id;

        // Kiểm tra ghế tồn tại
        const seat = await Seat.findById(seatId);
        if (!seat) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế', null));
        }

        // Cập nhật thông tin
        const updatedSeat = await Seat.findByIdAndUpdate(
            seatId,
            { type, price, is_available },
            { new: true, runValidators: true }
        );

        res.status(200).json(createResponse(200, 'Cập nhật ghế thành công', updatedSeat));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật ghế', error.message));
    }
};

// Xóa ghế
exports.deleteSeat = async (req, res) => {
    try {
        const seatId = req.params.id;

        // Kiểm tra ghế tồn tại
        const seat = await Seat.findById(seatId);
        if (!seat) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế', null));
        }

        // Xóa ghế
        await Seat.findByIdAndDelete(seatId);
        res.status(200).json(createResponse(200, 'Xóa ghế thành công', null));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa ghế', error.message));
    }
}; 