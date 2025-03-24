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

// Lấy danh sách phòng
exports.getRoom = async (req, res) => {
    try {
        let { page, limit } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        const rooms = await Room.find()

            .skip(skip)
            .limit(limit);

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
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách phòng', error.message));
    }
};

// Lấy phòng theo ID
exports.getRoomId = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng', null));
        }
        res.status(200).json(createResponse(200, null, room));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi lấy phòng', error.message));
    }
};

// Thêm phòng
exports.addRoom = async (req, res) => {
    const { cinema_id, room_name, room_status } = req.body;

    if (!cinema_id || !room_name || room_status === undefined) { // Thêm kiểm tra room_status
        return res.status(400).json(createResponse(400, 'Thiếu thông tin bắt buộc', null));
    }

    try {
        const cinema = await Cinema.findById(cinema_id);
        if (!cinema) {
            return res.status(400).json(createResponse(400, 'cinema_id không tồn tại', null));
        }

        const room = new Room({
            cinema_id,
            room_name,
            room_status
        });

        await room.save();
        res.status(201).json(createResponse(201, null, 'Thêm phòng thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi thêm phòng', error.message));
    }
};

// Cập nhật phòng
exports.updateRoom = async (req, res) => {
    try {
        const { cinema_id } = req.body;
        if (cinema_id) {
            const cinema = await Cinema.findById(cinema_id);
            if (!cinema) {
                return res.status(400).json(createResponse(400, 'cinema_id không tồn tại', null));
            }
        }
        const updatedRoom = await Room.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('cinema_id');

        if (!updatedRoom) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng', null));
        }

        res.status(200).json(createResponse(200, null, 'Cập nhật phòng thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật phòng', error.message));
    }
};

// Xóa phòng
exports.deleteRoom = async (req, res) => {
    try {
        const deletedRoom = await Room.findByIdAndDelete(req.params.id);
        if (!deletedRoom) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng', null));
        }

        res.status(200).json(createResponse(200, null, 'Xóa phòng thành công'));
    } catch (error) {
        res.status(500).json(createResponse(500, 'Lỗi khi xóa phòng', error.message));
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