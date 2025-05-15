// SECTION: Import các modules cần thiết
const Room = require('../models/room');
const Cinema = require('../models/cinema');
const Seat = require('../models/seat');
const createResponse = require('../utils/responseHelper');

// ANCHOR: Middleware và functions hỗ trợ
/**
 * Middleware kiểm tra ID hợp lệ
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const validateId = (req, res, next) => {
    // FIXME: Cần thêm kiểm tra định dạng ID có đúng mongoDB ObjectId không
    if (!req.params.id) {
        return res.status(400).json(createResponse(400, 'Thiếu ID phòng', null));
    }
    next();
};

// SECTION: API endpoints xử lý phòng chiếu
/**
 * Lấy danh sách phòng với phân trang
 * @route GET /api/rooms
 */
exports.getRoom = async (req, res) => {
    try {
        let { page, limit } = req.query;

        // NOTE: Đặt giá trị mặc định cho phân trang
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // TODO: Thêm tùy chọn lọc theo trạng thái và loại phòng
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

/**
 * Lấy thông tin phòng theo ID
 * @route GET /api/rooms/:id
 */
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

/**
 * Tạo phòng mới
 * @route POST /api/rooms
 * @param {Object} req.body - Thông tin phòng mới
 * @param {string} req.body.cinema_id - ID của rạp
 * @param {string} req.body.room_name - Tên phòng
 * @param {string} req.body.room_style - Loại phòng (2D, 3D, 4DX, IMAX)
 */
exports.addRoom = async (req, res) => {
    try {
        const { cinema_id, room_name, room_style } = req.body;

        // IMPORTANT: Kiểm tra đầy đủ thông tin bắt buộc
        if (!cinema_id) {
            return res.status(400).json(createResponse(400, 'Thiếu thông tin rạp (cinema_id)', null));
        }
        if (!room_name) {
            return res.status(400).json(createResponse(400, 'Thiếu tên phòng (room_name)', null));
        }
        if (!room_style) {
            return res.status(400).json(createResponse(400, 'Thiếu loại phòng (room_style)', null));
        }

        // Kiểm tra rạp tồn tại
        const cinema = await Cinema.findById(cinema_id);
        if (!cinema) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy rạp với ID đã cung cấp', null));
        }

        // WARNING: Kiểm tra room_style hợp lệ
        const validStyles = ['2D', '3D', '4DX', 'IMAX'];
        if (!validStyles.includes(room_style)) {
            return res.status(400).json(createResponse(400, 'Loại phòng không hợp lệ. Chỉ chấp nhận: 2D, 3D, 4DX, IMAX', null));
        }

        // Kiểm tra tên phòng đã tồn tại trong rạp chưa
        const existingRoom = await Room.findOne({ cinema_id, room_name });
        if (existingRoom) {
            return res.status(400).json(createResponse(400, 'Tên phòng đã tồn tại trong rạp này', null));
        }

        // NOTE: Tạo phòng mới với total_seat mặc định là 0
        const room = new Room({
            cinema_id,
            room_name,
            room_style,
            total_seat: 0,
            status: 'active'
        });

        const savedRoom = await room.save();

        // IMPORTANT: Cập nhật total_room của cinema
        cinema.total_room += 1;
        await cinema.save();

        await savedRoom.populate('cinema_id');
        res.status(201).json(createResponse(201, 'Tạo phòng mới thành công', savedRoom));
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo phòng mới', null));
    }
};

/**
 * Cập nhật thông tin phòng
 * @route PUT /api/rooms/:id
 */
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

        // WARNING: Kiểm tra room_style hợp lệ nếu có cập nhật
        if (room_style) {
            const validStyles = ['2D', '3D', '4DX', 'IMAX'];
            if (!validStyles.includes(room_style)) {
                return res.status(400).json(createResponse(400, 'Loại phòng không hợp lệ. Chỉ chấp nhận: 2D, 3D, 4DX, IMAX', null));
            }
        }

        // FIXME: Kiểm tra total_seat hợp lệ nếu có cập nhật
        // Nên đảm bảo total_seat khớp với số lượng ghế thực tế trong database
        if (total_seat !== undefined) {
            if (total_seat <= 0) {
                return res.status(400).json(createResponse(400, 'Số lượng ghế phải lớn hơn 0', null));
            }
        }

        // NOTE: Kiểm tra status hợp lệ nếu có cập nhật
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

        // IMPORTANT: Cập nhật thông tin
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

/**
 * Xóa phòng
 * @route DELETE /api/rooms/:id
 */
exports.deleteRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng', null));
        }

        // TODO: Kiểm tra phòng có đang được sử dụng trong lịch chiếu không trước khi xóa

        // IMPORTANT: Lấy thông tin cinema để cập nhật total_room
        const cinema = await Cinema.findById(room.cinema_id);
        if (cinema) {
            cinema.total_room = Math.max(0, cinema.total_room - 1); // Đảm bảo không âm
            await cinema.save();
        }

        await Room.deleteOne({ _id: req.params.id });
        res.json(createResponse(200, 'Xóa phòng thành công', null));
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa phòng', null));
    }
};

/**
 * Lấy danh sách phòng theo rạp
 * @route GET /api/cinemas/:cinemaId/rooms
 */
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

// SECTION: Các hàm tiện ích

/**
 * Cập nhật số lượng ghế của phòng
 * @param {string} roomId - ID của phòng cần cập nhật
 * @returns {Promise<number>} Số lượng ghế đã cập nhật
 * @private
 */
const updateRoomTotalSeats = async (roomId) => {
    try {
        // Đếm số lượng ghế trong phòng
        const seatCount = await Seat.countDocuments({ room_id: roomId });

        // OPTIMIZE: Có thể sử dụng aggregation để đếm ghế theo trạng thái
        await Room.findByIdAndUpdate(roomId, { total_seat: seatCount });

        return seatCount;
    } catch (error) {
        console.error('Update room total seats error:', error);
        throw error;
    }
};

// IDEA: Thêm endpoint để tạo sơ đồ ghế tự động theo mẫu có sẵn

// LINK: Tham khảo mô hình dữ liệu tại https://github.com/example/cinema-booking-models

// Export function để các controller khác có thể sử dụng
exports.updateRoomTotalSeats = updateRoomTotalSeats;