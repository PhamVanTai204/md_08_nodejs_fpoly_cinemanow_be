const Seat = require('../models/seat');
const Room = require('../models/room');
const createResponse = require('../utils/responseHelper');
const { updateRoomTotalSeats } = require('./room.controller');

// Lấy tất cả ghế
exports.getAllSeats = async (req, res) => {
    try {
        const seats = await Seat.find()
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });
        res.json(createResponse(200, null, seats));
    } catch (error) {
        console.error('Get all seats error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách ghế', null));
    }
};

// Lấy ghế theo ID
exports.getSeatById = async (req, res) => {
    try {
        const seat = await Seat.findById(req.params.id)
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });

        if (!seat) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế', null));
        }

        res.json(createResponse(200, null, seat));
    } catch (error) {
        console.error('Get seat by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin ghế', null));
    }
};

// Tạo ghế mới
exports.createSeat = async (req, res) => {
    try {
        const { seat_id, room_id, seat_status, seat_type, price_seat, column_of_seat, row_of_seat } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!seat_id || !room_id || !seat_type || !price_seat || !column_of_seat || !row_of_seat) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra seat_id đã tồn tại
        const existingSeat = await Seat.findOne({ seat_id });
        if (existingSeat) {
            return res.status(400).json(createResponse(400, 'Mã ghế đã tồn tại', null));
        }

        // Kiểm tra phòng tồn tại
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng', null));
        }

        // Kiểm tra ghế đã tồn tại trong phòng với vị trí tương tự
        const existingSeatPosition = await Seat.findOne({
            room_id,
            column_of_seat,
            row_of_seat
        });

        if (existingSeatPosition) {
            return res.status(400).json(createResponse(400, 'Vị trí ghế đã tồn tại trong phòng này', null));
        }

        const newSeat = new Seat({
            seat_id,
            room_id,
            seat_status,
            seat_type,
            price_seat,
            column_of_seat,
            row_of_seat
        });

        const savedSeat = await newSeat.save();

        // Cập nhật số lượng ghế của phòng
        const totalSeats = await updateRoomTotalSeats(room_id);

        // Populate thông tin liên quan
        const populatedSeat = await Seat.findById(savedSeat._id)
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });

        res.status(201).json(createResponse(201, 'Tạo ghế thành công', {
            seat: populatedSeat,
            room_total_seats: totalSeats
        }));
    } catch (error) {
        console.error('Create seat error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo ghế', null));
    }
};

// Cập nhật ghế
exports.updateSeatStatus = async (req, res) => {
    try {
        const { seat_status } = req.body;
        const id = req.params.id;

        // Kiểm tra xem trạng thái có hợp lệ không
        if (!['available', 'booked', 'unavailable'].includes(seat_status)) {
            return res.status(400).json(createResponse(400, "Trạng thái ghế không hợp lệ", null));
        }

        // Kiểm tra ghế tồn tại
        const seat = await Seat.findById(id);
        if (!seat) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế', null));
        }

        // Cập nhật trạng thái ghế
        seat.seat_status = seat_status;
        const updatedSeat = await seat.save();

        // Populate thông tin liên quan
        const populatedSeat = await Seat.findById(updatedSeat._id)
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });

        res.json(createResponse(200, 'Cập nhật trạng thái ghế thành công', populatedSeat));
    } catch (error) {
        console.error('Update seat status error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật trạng thái ghế', null));
    }
};


// Xóa ghế
exports.deleteSeat = async (req, res) => {
    try {
        const seat = await Seat.findById(req.params.id);
        if (!seat) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế', null));
        }

        const roomId = seat.room_id;
        await Seat.deleteOne({ _id: req.params.id });

        // Cập nhật số lượng ghế của phòng
        const totalSeats = await updateRoomTotalSeats(roomId);

        res.json(createResponse(200, 'Xóa ghế thành công', { room_total_seats: totalSeats }));
    } catch (error) {
        console.error('Delete seat error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa ghế', null));
    }
};

exports.addMultipleSeats = async (req, res) => {
    const { room_id, rows, cols, seat_status, seat_type, price_seat } = req.body;

    // Kiểm tra đầu vào
    if (!room_id || !rows || !cols || !seat_status || !seat_type || !price_seat) {
        return res.status(400).json(createResponse(400, "Thiếu thông tin bắt buộc", null));
    }

    try {
        // Kiểm tra phòng có tồn tại không
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json(createResponse(404, "Không tìm thấy phòng", null));
        }

        let seats = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const seatId = `${room_id}-${String.fromCharCode(65 + i)}${j + 1}`; // Tạo ID ghế
                const column = j + 1;
                const row = String.fromCharCode(65 + i);

                seats.push({
                    seat_id: seatId,
                    room_id,
                    seat_status,
                    seat_type,
                    price_seat,
                    column_of_seat: column.toString(),
                    row_of_seat: row
                });
            }
        }

        // Chèn ghế vào database
        await Seat.insertMany(seats);
        res.status(201).json(createResponse(201, `Thêm ${rows * cols} ghế thành công`, null));
    } catch (error) {
        console.error("Lỗi khi thêm ghế hàng loạt:", error);
        res.status(500).json(createResponse(500, "Lỗi khi thêm ghế", error.message));
    }
};
exports.deleteMultipleSeats = async (req, res) => {
    const { room_id, seat_ids } = req.body;

    try {
        if (!room_id && (!seat_ids || seat_ids.length === 0)) {
            return res.status(400).json(createResponse(400, "Cần cung cấp room_id hoặc danh sách seat_ids", null));
        }

        let deleteResult;
        if (room_id) {
            // Xóa tất cả ghế trong một phòng
            deleteResult = await Seat.deleteMany({ room_id });
        } else if (seat_ids) {
            // Xóa danh sách ghế theo seat_id
            deleteResult = await Seat.deleteMany({ seat_id: { $in: seat_ids } });
        }

        if (deleteResult.deletedCount === 0) {
            return res.status(404).json(createResponse(404, "Không tìm thấy ghế để xóa", null));
        }

        res.json(createResponse(200, `Xóa ${deleteResult.deletedCount} ghế thành công`, null));
    } catch (error) {
        console.error("Delete multiple seats error:", error);
        res.status(500).json(createResponse(500, "Lỗi khi xóa ghế", error.message));
    }
};
exports.updateMultipleSeatsStatus = async (req, res) => {
    const { seat_ids, room_id, seat_status } = req.body;

    try {
        if (!seat_status || (!seat_ids && !room_id)) {
            return res.status(400).json(createResponse(400, "Cần cung cấp seat_status và seat_ids hoặc room_id", null));
        }

        if (!['available', 'booked', 'unavailable'].includes(seat_status)) {
            return res.status(400).json(createResponse(400, "Trạng thái ghế không hợp lệ", null));
        }

        let updateResult;
        if (room_id) {
            // Cập nhật tất cả ghế trong một phòng
            updateResult = await Seat.updateMany({ room_id }, { seat_status });
        } else if (seat_ids) {
            // Cập nhật trạng thái theo danh sách seat_id
            updateResult = await Seat.updateMany({ seat_id: { $in: seat_ids } }, { seat_status });
        }

        if (updateResult.matchedCount === 0) {
            return res.status(404).json(createResponse(404, "Không tìm thấy ghế để cập nhật", null));
        }

        res.json(createResponse(200, `Cập nhật trạng thái cho ${updateResult.modifiedCount} ghế thành công`, null));
    } catch (error) {
        console.error("Update multiple seats status error:", error);
        res.status(500).json(createResponse(500, "Lỗi khi cập nhật trạng thái ghế", error.message));
    }
};
