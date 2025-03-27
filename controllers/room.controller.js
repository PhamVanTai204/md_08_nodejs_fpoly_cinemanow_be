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
            .populate('cinema_id')
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
        console.error('Get rooms error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách phòng', null));
    }
};

// Lấy phòng theo ID
exports.getRoomId = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id).populate('cinema_id');
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng', null));
        }
        res.status(200).json(createResponse(200, null, room));
    } catch (error) {
        console.error('Get room by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin phòng', null));
    }
};

// Thêm phòng mới
exports.addRoom = async (req, res) => {
    try {
        const { cinema_id, room_name, room_style, total_seat } = req.body;

        // Kiểm tra đầy đủ thông tin bắt buộc
        if (!cinema_id) {
            return res.status(400).json(createResponse(400, 'Thiếu thông tin rạp (cinema_id)', null));
        }
        if (!room_name) {
            return res.status(400).json(createResponse(400, 'Thiếu tên phòng (room_name)', null));
        }
        if (!room_style) {
            return res.status(400).json(createResponse(400, 'Thiếu loại phòng (room_style)', null));
        }
        if (!total_seat) {
            return res.status(400).json(createResponse(400, 'Thiếu số lượng ghế (total_seat)', null));
        }

        // Kiểm tra rạp tồn tại
        const cinema = await Cinema.findById(cinema_id);
        if (!cinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp với ID đã cung cấp', null));
        }

        // Kiểm tra room_style hợp lệ
        const validStyles = ['2D', '3D', '4DX', 'IMAX'];
        if (!validStyles.includes(room_style)) {
            return res.status(400).json(createResponse(400, 'Loại phòng không hợp lệ. Chỉ chấp nhận: 2D, 3D, 4DX, IMAX', null));
        }

        // Kiểm tra total_seat là số dương
        if (total_seat <= 0) {
            return res.status(400).json(createResponse(400, 'Số lượng ghế phải lớn hơn 0', null));
        }

        // Kiểm tra tên phòng đã tồn tại trong rạp chưa
        const existingRoom = await Room.findOne({ cinema_id, room_name });
        if (existingRoom) {
            return res.status(400).json(createResponse(400, 'Tên phòng đã tồn tại trong rạp này', null));
        }

        const room = new Room({
            cinema_id,
            room_name,
            room_style,
            total_seat,
            status: 'active' // Mặc định là active khi tạo mới
        });

        const savedRoom = await room.save();
        await savedRoom.populate('cinema_id');
        res.status(201).json(createResponse(201, 'Tạo phòng mới thành công', savedRoom));
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo phòng mới', null));
    }
};

// Cập nhật phòng
exports.updateRoom = async (req, res) => {
    try {
        const { cinema_id, room_name, room_style, total_seat, status } = req.body;
        const roomId = req.params.id;

        // Kiểm tra phòng tồn tại
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng', null));
        }

        // Nếu cập nhật rạp
        if (cinema_id) {
            const cinema = await Cinema.findById(cinema_id);
            if (!cinema) {
                return res.status(404).json(createResponse(404, 'Không tìm thấy rạp với ID đã cung cấp', null));
            }
        }

        // Kiểm tra room_style hợp lệ nếu có cập nhật
        if (room_style) {
            const validStyles = ['2D', '3D', '4DX', 'IMAX'];
            if (!validStyles.includes(room_style)) {
                return res.status(400).json(createResponse(400, 'Loại phòng không hợp lệ. Chỉ chấp nhận: 2D, 3D, 4DX, IMAX', null));
            }
        }

        // Kiểm tra total_seat hợp lệ nếu có cập nhật
        if (total_seat !== undefined) {
            if (total_seat <= 0) {
                return res.status(400).json(createResponse(400, 'Số lượng ghế phải lớn hơn 0', null));
            }
        }

        // Kiểm tra status hợp lệ nếu có cập nhật
        if (status) {
            const validStatus = ['active', 'maintenance', 'inactive'];
            if (!validStatus.includes(status)) {
                return res.status(400).json(createResponse(400, 'Trạng thái không hợp lệ. Chỉ chấp nhận: active, maintenance, inactive', null));
            }
        }

        // Kiểm tra tên phòng trùng nếu có cập nhật tên
        if (room_name && room_name !== room.room_name) {
            const existingRoom = await Room.findOne({
                cinema_id: cinema_id || room.cinema_id,
                room_name,
                _id: { $ne: roomId }
            });
            if (existingRoom) {
                return res.status(400).json(createResponse(400, 'Tên phòng đã tồn tại trong rạp này', null));
            }
        }

        // Cập nhật thông tin
        if (cinema_id) room.cinema_id = cinema_id;
        if (room_name) room.room_name = room_name;
        if (room_style) room.room_style = room_style;
        if (total_seat !== undefined) room.total_seat = total_seat;
        if (status) room.status = status;

        const updatedRoom = await room.save();
        await updatedRoom.populate('cinema_id');
        res.json(createResponse(200, 'Cập nhật phòng thành công', updatedRoom));
    } catch (error) {
        console.error('Update room error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật phòng', null));
    }
};

// Xóa phòng
exports.deleteRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng', null));
        }

        await Room.deleteOne({ _id: req.params.id });
        res.json(createResponse(200, 'Xóa phòng thành công', null));
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa phòng', null));
    }
};

//Lấy các phòng thuộc 1 cinema
exports.getRoomsByCinema = async (req, res) => {
    try {
        const { cinemaId } = req.params;
        
        // Kiểm tra cinema tồn tại
        const cinema = await Cinema.findById(cinemaId);
        if (!cinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp với ID đã cung cấp', null));
        }

        const rooms = await Room.find({ cinema_id: cinemaId }).populate('cinema_id');
        if (rooms.length === 0) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng nào thuộc rạp này', null));
        }
        res.json(createResponse(200, null, rooms));
    } catch (error) {
        console.error('Get rooms by cinema error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách phòng theo rạp', null));
    }
};
