const Seat = require('../models/seat');
const Room = require('../models/room');
const createResponse = require('../utils/responseHelper');
const { updateRoomTotalSeats } = require('./room.controller');
const mongoose = require('mongoose');
const pusher = require('../utils/pusher');

// SECTION: API quản lý ghế ngồi trong rạp chiếu phim
// LINK: https://pusher.com/docs/channels/ - Sử dụng Pusher Channels để thông báo thay đổi realtime

// ANCHOR: Lấy tất cả ghế
exports.getAllSeats = async (req, res) => {
    try {
        // NOTE: Populate thông tin phòng và rạp liên quan
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

// ANCHOR: Lấy ghế theo ID
exports.getSeatById = async (req, res) => {
    try {
        // NOTE: Populate thông tin phòng và rạp liên quan
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

// ANCHOR: Tạo ghế mới
exports.createSeat = async (req, res) => {
    try {
        const { seat_id, room_id, seat_status, seat_type, price_seat, column_of_seat, row_of_seat } = req.body;

        // IMPORTANT: Kiểm tra đầy đủ thông tin đầu vào
        if (!seat_id || !room_id || !seat_type || !price_seat || !column_of_seat || !row_of_seat) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // NOTE: Kiểm tra seat_id đã tồn tại
        const existingSeat = await Seat.findOne({ seat_id });
        if (existingSeat) {
            return res.status(400).json(createResponse(400, 'Mã ghế đã tồn tại', null));
        }

        // NOTE: Kiểm tra phòng tồn tại
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phòng', null));
        }

        // WARNING: Kiểm tra ghế đã tồn tại trong phòng với vị trí tương tự
        const existingSeatPosition = await Seat.findOne({
            room_id,
            column_of_seat,
            row_of_seat
        });

        if (existingSeatPosition) {
            return res.status(400).json(createResponse(400, 'Vị trí ghế đã tồn tại trong phòng này', null));
        }

        // NOTE: Tạo đối tượng ghế mới
        const newSeat = new Seat({
            seat_id,
            room_id,
            seat_status,
            seat_type,
            price_seat,
            column_of_seat,
            row_of_seat
        });

        // DONE: Lưu ghế vào cơ sở dữ liệu
        const savedSeat = await newSeat.save();

        // IMPORTANT: Cập nhật số lượng ghế của phòng
        const totalSeats = await updateRoomTotalSeats(room_id);

        // NOTE: Populate thông tin liên quan
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

// ANCHOR: Cập nhật trạng thái ghế
// HIGHLIGHT: Sử dụng Pusher để cập nhật realtime cho tất cả người dùng
exports.updateSeatStatus = async (req, res) => {
    try {
        const { seat_status } = req.body;
        const id = req.params.id;

        // IMPORTANT: Kiểm tra xem trạng thái có hợp lệ không
        if (!['available', 'booked', 'unavailable', 'selecting'].includes(seat_status)) {
            return res.status(400).json(createResponse(400, "Trạng thái ghế không hợp lệ", null));
        }

        // NOTE: Kiểm tra ghế tồn tại
        const seat = await Seat.findById(id);
        if (!seat) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế', null));
        }

        // NOTE: Lấy room_id từ ghế
        const { room_id } = seat;

        // NOTE: Cập nhật trạng thái ghế
        seat.seat_status = seat_status;
        const updatedSeat = await seat.save();

        // NOTE: Populate thông tin liên quan
        const populatedSeat = await Seat.findById(updatedSeat._id)
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });

        // IMPORTANT: Gửi thông báo qua Pusher để cập nhật realtime
        pusher.trigger(`room-${room_id}`, 'seat-status-changed', {
            seat_id: seat.seat_id,
            status: seat_status,
            id: id
        });

        res.json(createResponse(200, 'Cập nhật trạng thái ghế thành công', populatedSeat));
    } catch (error) {
        console.error('Update seat status error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật trạng thái ghế', null));
    }
};

// ANCHOR: Xóa ghế
exports.deleteSeat = async (req, res) => {
    try {
        // NOTE: Tìm ghế cần xóa
        const seat = await Seat.findById(req.params.id);
        if (!seat) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế', null));
        }

        const roomId = seat.room_id;
        await Seat.deleteOne({ _id: req.params.id });

        // IMPORTANT: Cập nhật số lượng ghế của phòng
        const totalSeats = await updateRoomTotalSeats(roomId);

        res.json(createResponse(200, 'Xóa ghế thành công', { room_total_seats: totalSeats }));
    } catch (error) {
        console.error('Delete seat error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa ghế', null));
    }
};

// ANCHOR: Thêm nhiều ghế cùng lúc
exports.addMultipleSeats = async (req, res) => {
    const { room_id, rows, cols, price_seat } = req.body;

    // IMPORTANT: Kiểm tra thông tin bắt buộc
    if (!room_id || !rows || !cols || !price_seat) {
        return res.status(400).json(createResponse(400, "Thiếu thông tin bắt buộc", null));
    }

    // NOTE: Thiết lập các giá trị mặc định
    const defaultSeatStatus = 'available';
    const defaultSeatType = 'standard';

    try {
        // NOTE: Kiểm tra phòng tồn tại
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json(createResponse(404, "Không tìm thấy phòng", null));
        }

        // SECTION: Tạo mảng ghế mới theo hàng và cột
        let newSeats = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const seatId = `${String.fromCharCode(65 + i)}${j + 1}`;
                const column = j + 1;
                const row = String.fromCharCode(65 + i);

                newSeats.push({
                    seat_id: seatId,
                    room_id,
                    seat_status: defaultSeatStatus,
                    seat_type: defaultSeatType,
                    price_seat,
                    column_of_seat: column,
                    row_of_seat: row
                });
            }
        }

        // IMPORTANT: Kiểm tra và lọc ghế đã tồn tại
        const existingSeats = await Seat.find({ room_id });
        const existingSeatIds = new Set(existingSeats.map(s => s.seat_id));

        newSeats = newSeats.filter(seat => !existingSeatIds.has(seat.seat_id));

        if (newSeats.length === 0) {
            return res.status(400).json(createResponse(400, "Tất cả các ghế đã tồn tại trong phòng", null));
        }

        // DONE: Thêm nhiều ghế cùng lúc vào cơ sở dữ liệu
        await Seat.insertMany(newSeats);
        res.status(201).json(createResponse(201, `Thêm ${newSeats.length} ghế thành công`, null));
    } catch (error) {
        console.error("Lỗi khi thêm ghế hàng loạt:", error);
        res.status(500).json(createResponse(500, "Lỗi khi thêm ghế", error.message));
    }
};

// ANCHOR: Xóa nhiều ghế cùng lúc
exports.deleteMultipleSeats = async (req, res) => {
    const { room_id, seat_ids } = req.body;

    try {
        // IMPORTANT: Kiểm tra điều kiện xóa hợp lệ
        if (!room_id && (!seat_ids || seat_ids.length === 0)) {
            return res.status(400).json(createResponse(400, "Cần cung cấp room_id hoặc danh sách seat_ids", null));
        }

        let deleteResult;
        if (room_id) {
            // NOTE: Xóa tất cả ghế trong một phòng
            deleteResult = await Seat.deleteMany({ room_id });
        } else if (seat_ids) {
            // NOTE: Xóa danh sách ghế theo seat_id
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

// ANCHOR: Cập nhật thông tin nhiều ghế cùng lúc
exports.updateMultipleSeatsInfo = async (req, res) => {
    const { _ids, seat_type, price_seat } = req.body;

    // IMPORTANT: Kiểm tra danh sách ID hợp lệ
    if (!_ids || !Array.isArray(_ids) || _ids.length === 0) {
        return res.status(400).json(createResponse(400, "Danh sách _ids không hợp lệ", null));
    }

    // SECTION: Xây dựng dữ liệu cập nhật
    const updateData = {};
    if (seat_type) {
        // WARNING: Kiểm tra loại ghế hợp lệ
        if (!['standard', 'vip', 'couple'].includes(seat_type)) {
            return res.status(400).json(createResponse(400, "seat_type không hợp lệ", null));
        }
        updateData.seat_type = seat_type;
    }
    if (typeof price_seat === 'number') {
        updateData.price_seat = price_seat;
    }

    // NOTE: Kiểm tra có trường nào được cập nhật không
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json(createResponse(400, "Không có trường nào được cập nhật", null));
    }

    try {
        // NOTE: Chuyển đổi mảng ID sang ObjectId MongoDB
        const objectIds = _ids.map(id => new mongoose.Types.ObjectId(id));
        const updateResult = await Seat.updateMany(
            { _id: { $in: objectIds } },
            { $set: updateData }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json(createResponse(404, "Không tìm thấy ghế để cập nhật", null));
        }

        // NOTE: Lấy thông tin ghế đã cập nhật
        const updatedSeats = await Seat.find({ _id: { $in: objectIds } });

        res.json(createResponse(200, `Cập nhật thông tin ${updateResult.modifiedCount} ghế thành công`, updatedSeats));
    } catch (error) {
        console.error("Update multiple seats info error:", error);
        res.status(500).json(createResponse(500, "Lỗi khi cập nhật thông tin ghế", error.message));
    }
};

// ANCHOR: Tạo nhiều ghế cho phòng chiếu
// REVIEW: Phương thức này cần xem xét hiệu suất khi số lượng ghế lớn
exports.createMultipleSeats = async (req, res) => {
    try {
        const { room_id, rows, columns, seat_types, prices } = req.body;

        // IMPORTANT: Kiểm tra phòng tồn tại
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({
                status: false,
                message: 'Không tìm thấy phòng',
                data: null
            });
        }

        // NOTE: Xóa tất cả ghế cũ trong phòng (nếu có)
        await Seat.deleteMany({ room_id });

        // SECTION: Tạo mảng ghế mới
        const seats = [];
        const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        // NOTE: Tạo ghế theo hàng và cột
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns; j++) {
                const rowLabel = rowLetters[i];
                const columnLabel = (j + 1).toString().padStart(2, '0');

                // HIGHLIGHT: Xác định loại ghế và giá dựa vào vị trí
                let seat_type = 'standard';
                let price = prices.standard || 50000;

                // NOTE: Ghế VIP thường ở giữa phòng
                if (i >= Math.floor(rows * 0.3) && i < Math.floor(rows * 0.7) &&
                    j >= Math.floor(columns * 0.3) && j < Math.floor(columns * 0.7)) {
                    seat_type = 'vip';
                    price = prices.vip || 70000;
                }

                // NOTE: Ghế đôi thường ở cuối phòng
                if (i >= Math.floor(rows * 0.7) && j % 2 === 0 && j < columns - 1) {
                    seat_type = 'couple';
                    price = prices.couple || 120000;
                    // IMPORTANT: Bỏ qua ghế tiếp theo vì ghế đôi chiếm 2 vị trí
                    j++;
                }

                const seat = {
                    seat_id: `${room_id}-${rowLabel}${columnLabel}`,
                    room_id,
                    seat_status: 'available',
                    seat_type,
                    price_seat: price,
                    column_of_seat: columnLabel,
                    row_of_seat: rowLabel
                };

                seats.push(seat);
            }
        }

        // DONE: Lưu tất cả ghế vào database
        const createdSeats = await Seat.insertMany(seats);

        // IMPORTANT: Cập nhật tổng số ghế trong phòng
        room.total_seat = createdSeats.length;
        await room.save();

        res.status(201).json({
            status: true,
            message: 'Tạo ghế thành công',
            data: {
                total_seats: createdSeats.length,
                seats: createdSeats
            }
        });

    } catch (error) {
        console.error('Create seats error:', error);
        res.status(500).json({
            status: false,
            message: 'Lỗi khi tạo ghế',
            data: null
        });
    }
};

// ANCHOR: Đánh dấu ghế đang được chọn (tạm thời)
// HIGHLIGHT: Sử dụng Pusher để thông báo realtime cho tất cả người dùng
exports.temporarySelectSeats = async (req, res) => {
    const { seat_ids, room_id, user_id, showtime_id } = req.body;

    try {
        // IMPORTANT: Kiểm tra tham số đầu vào, bắt buộc phải có showtime_id
        if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0 || !room_id || !user_id || !showtime_id) {
            return res.status(400).json(createResponse(400, "Cần cung cấp đầy đủ seat_ids, room_id, user_id và showtime_id", null));
        }

        // NOTE: Tìm các ghế cần cập nhật
        const seats = await Seat.find({ seat_id: { $in: seat_ids }, room_id });

        // WARNING: Kiểm tra xem ghế có đang được chọn bởi người khác trong suất chiếu này không
        const unavailableSeats = [];

        for (const seat of seats) {
            const showtimeStatus = seat.showtime_status.find(st => st.showtime_id.toString() === showtime_id);
            if (showtimeStatus && (showtimeStatus.status === 'selecting' || showtimeStatus.status === 'booked')) {
                unavailableSeats.push(seat);
            }
        }

        if (unavailableSeats.length > 0) {
            return res.status(400).json(createResponse(400,
                `Ghế ${unavailableSeats.map(s => s.seat_id).join(', ')} đã được chọn hoặc đặt bởi người khác trong suất chiếu này`,
                null
            ));
        }

        // DONE: Cập nhật trạng thái theo showtime
        for (const seatId of seat_ids) {
            await Seat.updateOne(
                { seat_id: seatId, room_id },
                {
                    $set: {
                        "showtime_status.$[elem].status": "selecting",
                        "showtime_status.$[elem].selected_by": user_id,
                        "showtime_status.$[elem].selection_time": new Date()
                    }
                },
                {
                    arrayFilters: [{ "elem.showtime_id": new mongoose.Types.ObjectId(showtime_id) }],
                    upsert: false
                }
            );

            // Nếu không tìm thấy showtime_status, thêm mới
            const seat = await Seat.findOne({ seat_id: seatId, room_id });
            const hasShowtime = seat.showtime_status.some(st => st.showtime_id.toString() === showtime_id);

            if (!hasShowtime) {
                await Seat.updateOne(
                    { seat_id: seatId, room_id },
                    {
                        $push: {
                            showtime_status: {
                                showtime_id: new mongoose.Types.ObjectId(showtime_id),
                                status: "selecting",
                                selected_by: user_id,
                                selection_time: new Date()
                            }
                        }
                    }
                );
            }
        }

        // IMPORTANT: Gửi thông báo qua Pusher với channel riêng cho showtime
        const channelName = `room-${room_id}-${showtime_id}`;
        pusher.trigger(channelName, 'seats-selecting', {
            seat_ids,
            user_id,
            showtime_id,
            status: 'selecting'
        });

        res.json(createResponse(200, "Đánh dấu ghế đang được chọn thành công", null));
    } catch (error) {
        console.error("Temporary select seats error:", error);
        res.status(500).json(createResponse(500, "Lỗi khi đánh dấu ghế đang chọn", error.message));
    }
};

// ANCHOR: Giải phóng ghế khi hết thời gian chọn
// HIGHLIGHT: Sử dụng Pusher để thông báo realtime cho tất cả người dùng
exports.releaseSeats = async (req, res) => {
    const { seat_ids, room_id, user_id, showtime_id } = req.body;

    try {
        console.log("Yêu cầu giải phóng ghế:", { seat_ids, room_id, user_id, showtime_id });

        // IMPORTANT: Kiểm tra tham số đầu vào, bắt buộc phải có showtime_id
        if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0 || !room_id || !showtime_id) {
            return res.status(400).json(createResponse(400, "Cần cung cấp đầy đủ seat_ids, room_id và showtime_id", null));
        }

        let modifiedCount = 0;

        // DONE: Cập nhật trạng thái theo showtime
        for (const seatId of seat_ids) {
            const updateCondition = user_id
                ? { seat_id: seatId, room_id, "showtime_status.showtime_id": new mongoose.Types.ObjectId(showtime_id), "showtime_status.selected_by": user_id }
                : { seat_id: seatId, room_id, "showtime_status.showtime_id": new mongoose.Types.ObjectId(showtime_id) };

            const updateResult = await Seat.updateOne(
                updateCondition,
                {
                    $set: {
                        "showtime_status.$[elem].status": "available",
                        "showtime_status.$[elem].selected_by": null,
                        "showtime_status.$[elem].selection_time": null
                    }
                },
                {
                    arrayFilters: [{ "elem.showtime_id": new mongoose.Types.ObjectId(showtime_id) }]
                }
            );

            modifiedCount += updateResult.modifiedCount;
        }

        console.log("Số ghế đã giải phóng:", modifiedCount);

        if (modifiedCount === 0) {
            console.log("Không tìm thấy ghế cần giải phóng với điều kiện đã cho");
            return res.json(createResponse(200, "Không tìm thấy ghế cần giải phóng", null));
        }

        // IMPORTANT: Gửi thông báo qua Pusher với channel riêng cho showtime
        const channelName = `room-${room_id}-${showtime_id}`;
        pusher.trigger(channelName, 'seats-released', {
            seat_ids,
            user_id,
            showtime_id,
            status: 'available'
        });

        res.json(createResponse(200, `Đã giải phóng ${modifiedCount} ghế thành công`, null));
    } catch (error) {
        console.error("Release seats error:", error);
        res.status(500).json(createResponse(500, "Lỗi khi giải phóng ghế", error.message));
    }
};

// ANCHOR: Lấy trạng thái ghế theo showtime
exports.getSeatsByShowtime = async (req, res) => {
    try {
        const { room_id, showtime_id } = req.params;

        const seats = await Seat.find({ room_id })
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });

        // Xử lý trạng thái ghế theo showtime
        const seatsWithStatus = seats.map(seat => {
            const showtimeStatus = seat.showtime_status.find(st =>
                st.showtime_id.toString() === showtime_id
            );

            return {
                ...seat.toObject(),
                current_status: showtimeStatus ? showtimeStatus.status : 'available',
                current_selected_by: showtimeStatus ? showtimeStatus.selected_by : null,
                current_selection_time: showtimeStatus ? showtimeStatus.selection_time : null
            };
        });

        res.json(createResponse(200, null, seatsWithStatus));
    } catch (error) {
        console.error('Get seats by showtime error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách ghế theo showtime', null));
    }
};

// ANCHOR: Thông báo bắt đầu thanh toán
// HIGHLIGHT: Sử dụng Pusher để thông báo realtime cho tất cả người dùng
exports.initiatePayment = async (req, res) => {
    const { seat_ids, room_id, user_id, showtime_id } = req.body;

    try {
        // IMPORTANT: Kiểm tra tham số đầu vào
        if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0 || !room_id || !user_id) {
            return res.status(400).json(createResponse(400, "Cần cung cấp danh sách seat_ids, room_id và user_id", null));
        }

        // NOTE: Tạo chuỗi xác định kênh Pusher
        let channelName = `room-${room_id}`;

        // NOTE: Nếu có showtime_id, thêm vào tên kênh để kênh chỉ cập nhật cho suất chiếu cụ thể
        if (showtime_id) {
            channelName = `room-${room_id}-${showtime_id}`;
            console.log(`Sử dụng kênh Pusher cho suất chiếu: ${channelName}`);
        }

        // IMPORTANT: Gửi thông báo qua Pusher
        pusher.trigger(channelName, 'payment-initiated', {
            seat_ids,
            user_id,
            status: 'payment_initiated'
        });

        // NOTE: Gửi thông báo cũng đến kênh phòng chung để đảm bảo không bỏ lỡ ai
        if (showtime_id) {
            pusher.trigger(`room-${room_id}`, 'payment-initiated', {
                seat_ids,
                user_id,
                status: 'payment_initiated',
                showtime_id
            });
        }

        res.json(createResponse(200, "Đã thông báo bắt đầu thanh toán", null));
    } catch (error) {
        console.error("Initiate payment error:", error);
        res.status(500).json(createResponse(500, "Lỗi khi thông báo bắt đầu thanh toán", error.message));
    }
};

// SECTION: Tác vụ tự động giải phóng ghế
// IMPORTANT: Chạy mỗi 2 phút để giải phóng các ghế bị treo
// EXPERIMENTAL: Tác vụ tự động chạy ngầm
// SECTION: Tác vụ tự động giải phóng ghế theo showtime
setInterval(async () => {
    try {
        console.log('Chạy tác vụ tự động giải phóng ghế bị treo theo showtime');
        const timeoutMinutes = 5;
        const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

        // NOTE: Tìm tất cả ghế có showtime_status đang selecting và đã quá thời gian
        const seatsWithStaleSelections = await Seat.find({
            "showtime_status": {
                $elemMatch: {
                    status: 'selecting',
                    selection_time: { $lt: timeoutThreshold }
                }
            }
        });

        if (seatsWithStaleSelections.length > 0) {
            console.log(`Tìm thấy ${seatsWithStaleSelections.length} ghế có trạng thái bị treo cần giải phóng`);

            for (const seat of seatsWithStaleSelections) {
                // Tìm các showtime_status bị treo
                const staleStatuses = seat.showtime_status.filter(st =>
                    st.status === 'selecting' && st.selection_time < timeoutThreshold
                );

                for (const staleStatus of staleStatuses) {
                    // Cập nhật trạng thái
                    await Seat.updateOne(
                        { _id: seat._id },
                        {
                            $set: {
                                "showtime_status.$[elem].status": "available",
                                "showtime_status.$[elem].selected_by": null,
                                "showtime_status.$[elem].selection_time": null
                            }
                        },
                        {
                            arrayFilters: [{ "elem.showtime_id": staleStatus.showtime_id }]
                        }
                    );

                    // Gửi thông báo Pusher
                    const channelName = `room-${seat.room_id}-${staleStatus.showtime_id}`;
                    pusher.trigger(channelName, 'seats-released', {
                        seat_ids: [seat.seat_id],
                        showtime_id: staleStatus.showtime_id.toString(),
                        status: 'available'
                    });

                    console.log(`Đã giải phóng ghế ${seat.seat_id} cho showtime ${staleStatus.showtime_id}`);
                }
            }
        } else {
            console.log('Không tìm thấy ghế nào cần giải phóng');
        }
    } catch (error) {
        console.error('Lỗi khi chạy tác vụ tự động giải phóng ghế:', error);
    }
}, 2 * 60 * 1000);

// TODO: Thêm API lấy danh sách các ghế đang được chọn theo phòng và suất chiếu
// TODO: Thêm xác thực và kiểm tra quyền khi thực hiện các thao tác quản lý ghế
// IDEA: Lưu lịch sử thay đổi trạng thái ghế để theo dõi hành vi người dùng
// OPTIMIZE: Cần tối ưu hóa truy vấn đối với phòng có nhiều ghế