const Seat = require('../models/seat');
const Room = require('../models/room');
const createResponse = require('../utils/responseHelper');
const { updateRoomTotalSeats } = require('./room.controller');
const mongoose = require('mongoose');
const io = require('../utils/socket');

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
        if (!['available', 'booked', 'unavailable', 'selecting'].includes(seat_status)) {
            return res.status(400).json(createResponse(400, "Trạng thái ghế không hợp lệ", null));
        }

        // Kiểm tra ghế tồn tại
        const seat = await Seat.findById(id);
        if (!seat) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy ghế', null));
        }

        // Lấy room_id từ ghế
        const { room_id } = seat;

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

        // Gửi thông báo qua Pusher
        io.to(channelName).emit('eventName', payload);


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
    const { room_id, rows, cols, price_seat } = req.body;

    // Bắt buộc: room_id, rows, cols, price_seat
    if (!room_id || !rows || !cols || !price_seat) {
        return res.status(400).json(createResponse(400, "Thiếu thông tin bắt buộc", null));
    }

    // Mặc định:
    const defaultSeatStatus = 'available';
    const defaultSeatType = 'standard';

    try {
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json(createResponse(404, "Không tìm thấy phòng", null));
        }

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

        // Kiểm tra ghế đã tồn tại trong phòng
        const existingSeats = await Seat.find({ room_id });
        const existingSeatIds = new Set(existingSeats.map(s => s.seat_id));

        newSeats = newSeats.filter(seat => !existingSeatIds.has(seat.seat_id));

        if (newSeats.length === 0) {
            return res.status(400).json(createResponse(400, "Tất cả các ghế đã tồn tại trong phòng", null));
        }

        await Seat.insertMany(newSeats);
        res.status(201).json(createResponse(201, `Thêm ${newSeats.length} ghế thành công`, null));
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


exports.updateMultipleSeatsInfo = async (req, res) => {
    const { _ids, seat_type, price_seat } = req.body;

    if (!_ids || !Array.isArray(_ids) || _ids.length === 0) {
        return res.status(400).json(createResponse(400, "Danh sách _ids không hợp lệ", null));
    }

    const updateData = {};
    if (seat_type) {
        if (!['standard', 'vip', 'couple'].includes(seat_type)) {
            return res.status(400).json(createResponse(400, "seat_type không hợp lệ", null));
        }
        updateData.seat_type = seat_type;
    }
    if (typeof price_seat === 'number') {
        updateData.price_seat = price_seat;
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json(createResponse(400, "Không có trường nào được cập nhật", null));
    }

    try {
        const objectIds = _ids.map(id => new mongoose.Types.ObjectId(id));
        const updateResult = await Seat.updateMany(
            { _id: { $in: objectIds } },
            { $set: updateData }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json(createResponse(404, "Không tìm thấy ghế để cập nhật", null));
        }

        const updatedSeats = await Seat.find({ _id: { $in: objectIds } });

        res.json(createResponse(200, `Cập nhật thông tin ${updateResult.modifiedCount} ghế thành công`, updatedSeats));
    } catch (error) {
        console.error("Update multiple seats info error:", error);
        res.status(500).json(createResponse(500, "Lỗi khi cập nhật thông tin ghế", error.message));
    }
};


// Thêm nhiều ghế vào phòng
exports.createMultipleSeats = async (req, res) => {
    try {
        const { room_id, rows, columns, seat_types, prices } = req.body;

        // Kiểm tra room_id có tồn tại
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({
                status: false,
                message: 'Không tìm thấy phòng',
                data: null
            });
        }

        // Xóa tất cả ghế cũ trong phòng (nếu có)
        await Seat.deleteMany({ room_id });

        const seats = [];
        const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        // Tạo ghế theo hàng và cột
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns; j++) {
                const rowLabel = rowLetters[i];
                const columnLabel = (j + 1).toString().padStart(2, '0');

                // Xác định loại ghế và giá dựa vào vị trí
                let seat_type = 'standard';
                let price = prices.standard || 50000;

                // Ghế VIP thường ở giữa phòng
                if (i >= Math.floor(rows * 0.3) && i < Math.floor(rows * 0.7) &&
                    j >= Math.floor(columns * 0.3) && j < Math.floor(columns * 0.7)) {
                    seat_type = 'vip';
                    price = prices.vip || 70000;
                }

                // Ghế đôi thường ở cuối phòng
                if (i >= Math.floor(rows * 0.7) && j % 2 === 0 && j < columns - 1) {
                    seat_type = 'couple';
                    price = prices.couple || 120000;
                    // Bỏ qua ghế tiếp theo vì ghế đôi chiếm 2 vị trí
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

        // Lưu tất cả ghế vào database
        const createdSeats = await Seat.insertMany(seats);

        // Cập nhật tổng số ghế trong phòng
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

// Thêm endpoint mới cho việc cập nhật trạng thái tạm thời (khi người dùng đang chọn ghế)
exports.temporarySelectSeats = async (req, res) => {
    const { seat_ids, room_id, user_id, showtime_id } = req.body;

    try {
        if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0 || !room_id || !user_id) {
            return res.status(400).json(createResponse(400, "Cần cung cấp danh sách seat_ids, room_id và user_id", null));
        }

        // Tìm các ghế cần cập nhật
        const seats = await Seat.find({ seat_id: { $in: seat_ids }, room_id });

        // Kiểm tra xem ghế có đang được chọn bởi người khác không
        const unavailableSeats = seats.filter(seat =>
            seat.seat_status === 'selecting' || seat.seat_status === 'booked'
        );

        if (unavailableSeats.length > 0) {
            return res.status(400).json(createResponse(400,
                `Ghế ${unavailableSeats.map(s => s.seat_id).join(', ')} đã được chọn hoặc đặt bởi người khác`,
                null
            ));
        }

        // Cập nhật trạng thái thành 'selecting'
        await Seat.updateMany(
            { seat_id: { $in: seat_ids }, room_id },
            {
                seat_status: 'selecting',
                selected_by: user_id,  // Thêm thông tin người đang chọn
                selection_time: new Date()  // Thêm thời gian bắt đầu chọn
            }
        );
         
        // Tạo chuỗi xác định kênh Pusher
        let channelName = `room-${room_id}`;
        
        // Nếu có showtime_id, thêm vào tên kênh để kênh chỉ cập nhật cho suất chiếu cụ thể
        if (showtime_id) {
            channelName = `room-${room_id}-${showtime_id}`;
            console.log(`Sử dụng kênh Pusher cho suất chiếu: ${channelName}`);
        }
 
        // Gửi thông báo qua Pusher
        pusher.trigger(channelName, 'seats-selecting', {
            seat_ids,
            user_id,
            status: 'selecting'
        });

        res.json(createResponse(200, "Đánh dấu ghế đang được chọn thành công", null));
    } catch (error) {
        console.error("Temporary select seats error:", error);
        res.status(500).json(createResponse(500, "Lỗi khi đánh dấu ghế đang chọn", error.message));
    }
};

// Thêm endpoint giải phóng ghế khi hết thời gian chọn
exports.releaseSeats = async (req, res) => {
    const { seat_ids, room_id, user_id, showtime_id } = req.body;

    try {
        console.log("Yêu cầu giải phóng ghế:", { seat_ids, room_id, user_id, showtime_id });
        
        if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
            return res.status(400).json(createResponse(400, "Cần cung cấp danh sách seat_ids", null));
        }

         if (!room_id) {
            return res.status(400).json(createResponse(400, "Cần cung cấp room_id", null));
        }

        // Xác định điều kiện lọc linh hoạt hơn, hỗ trợ cả seat_id và _id
        let filterCondition;
        
        // Trường hợp 1: Kiểm tra seat_ids có phải ObjectId (có thể là _id từ MongoDB)
        if (seat_ids.every(id => mongoose.Types.ObjectId.isValid(id))) {
            console.log("Sử dụng _id để tìm ghế");
            
            // Nếu có user_id, chỉ giải phóng ghế của user đó
            filterCondition = user_id 
                ? { 
                    $or: [
                        { _id: { $in: seat_ids }, room_id, selected_by: user_id, seat_status: 'selecting' },
                        { seat_id: { $in: seat_ids }, room_id, selected_by: user_id, seat_status: 'selecting' }
                    ]
                }
                : { 
                    $or: [
                        { _id: { $in: seat_ids }, room_id, seat_status: 'selecting' },
                        { seat_id: { $in: seat_ids }, room_id, seat_status: 'selecting' }
                    ]
                };
        } else {
            console.log("Sử dụng seat_id để tìm ghế");
            
            // Nếu có user_id, chỉ giải phóng ghế của user đó
            filterCondition = user_id 
                ? { seat_id: { $in: seat_ids }, room_id, selected_by: user_id, seat_status: 'selecting' }
                : { seat_id: { $in: seat_ids }, room_id, seat_status: 'selecting' };
        }
        
        console.log("Filter condition:", JSON.stringify(filterCondition));
        
 
        // Cập nhật trạng thái trở lại 'available'
        const updateResult = await Seat.updateMany(
            filterCondition,
            {
                seat_status: 'available',
                selected_by: null,
                selection_time: null
            }
        );
         
        console.log("Kết quả cập nhật:", updateResult);
        

        if (updateResult.modifiedCount === 0) {
            // Nếu không tìm thấy ghế cần giải phóng, vẫn trả về thành công để không làm gián đoạn quy trình
            console.log("Không tìm thấy ghế cần giải phóng với điều kiện đã cho");
            return res.json(createResponse(200, "Không tìm thấy ghế cần giải phóng", null));
        }

        // Tạo chuỗi xác định kênh Pusher
        let channelName = `room-${room_id}`;
        
        // Nếu có showtime_id, thêm vào tên kênh để kênh chỉ cập nhật cho suất chiếu cụ thể
        if (showtime_id) {
            channelName = `room-${room_id}-${showtime_id}`;
            console.log(`Sử dụng kênh Pusher cho suất chiếu: ${channelName}`);
        }

        // Gửi thông báo qua Pusher
        pusher.trigger(channelName, 'seats-released', {
            seat_ids,
            user_id,
            status: 'available'
        });

        res.json(createResponse(200, `Đã giải phóng ${updateResult.modifiedCount} ghế thành công`, null));
    } catch (error) {
        console.error("Release seats error:", error);
        res.status(500).json(createResponse(500, "Lỗi khi giải phóng ghế", error.message));
    }
};

// Thêm endpoint để thông báo bắt đầu thanh toán
exports.initiatePayment = async (req, res) => {
    const { seat_ids, room_id, user_id, showtime_id } = req.body;

    try {
        if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0 || !room_id || !user_id) {
            return res.status(400).json(createResponse(400, "Cần cung cấp danh sách seat_ids, room_id và user_id", null));
        }

        // Tạo chuỗi xác định kênh Pusher
        let channelName = `room-${room_id}`;
        
        // Nếu có showtime_id, thêm vào tên kênh để kênh chỉ cập nhật cho suất chiếu cụ thể
        if (showtime_id) {
            channelName = `room-${room_id}-${showtime_id}`;
            console.log(`Sử dụng kênh Pusher cho suất chiếu: ${channelName}`);
        }
        
        // Gửi thông báo qua Pusher
        pusher.trigger(channelName, 'payment-initiated', {
            seat_ids,
            user_id,
            status: 'payment_initiated'
        });
        
        // Gửi thông báo cũng đến kênh phòng chung để đảm bảo không bỏ lỡ ai
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

// Thêm hàm cleanup tự động cho ghế đang chọn
// Chạy mỗi 2 phút để giải phóng các ghế bị treo
setInterval(async () => {
    try {
        console.log('Chạy tác vụ tự động giải phóng ghế bị treo');
        const timeoutMinutes = 5; // Thời gian timeout 5 phút
        const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);
        
        // Tìm tất cả ghế đang ở trạng thái selecting và đã quá thời gian
        const staleSeatSelections = await Seat.find({
            seat_status: 'selecting',
            selection_time: { $lt: timeoutThreshold }
        });
        
        if (staleSeatSelections.length > 0) {
            console.log(`Tìm thấy ${staleSeatSelections.length} ghế bị treo cần giải phóng`);
            
            // Tạo danh sách ghế cần giải phóng theo phòng
            const seatsByRoom = staleSeatSelections.reduce((groups, seat) => {
                const roomId = seat.room_id.toString();
                if (!groups[roomId]) {
                    groups[roomId] = [];
                }
                groups[roomId].push(seat);
                return groups;
            }, {});
            
            // Giải phóng ghế theo từng phòng
            for (const [roomId, seats] of Object.entries(seatsByRoom)) {
                const seatIds = seats.map(seat => seat.seat_id);
                await Seat.updateMany(
                    { seat_id: { $in: seatIds }, room_id: roomId },
                    { 
                        seat_status: 'available',
                        selected_by: null,
                        selection_time: null
                    }
                );
                
                // Gửi thông báo qua Pusher
                pusher.trigger(`room-${roomId}`, 'seats-released', {
                    seat_ids: seatIds,
                    status: 'available'
                });
                
                console.log(`Đã giải phóng ${seatIds.length} ghế trong phòng ${roomId}`);
            }
        } else {
            console.log('Không tìm thấy ghế nào cần giải phóng');
        }
    } catch (error) {
        console.error('Lỗi khi chạy tác vụ tự động giải phóng ghế:', error);
    }
}, 2 * 60 * 1000); // Chạy mỗi 2 phút
