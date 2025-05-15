const Ticket = require('../models/ticket');
const User = require('../models/user');
const ShowTime = require('../models/showTime');
const Voucher = require('../models/voucher');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// SECTION: Quản lý vé - chức năng quản trị
// ANCHOR: Lấy tất cả vé trong hệ thống
exports.getAllTickets = async (req, res) => {
    try {
        // NOTE: Sử dụng populate để lấy đầy đủ thông tin liên quan từ các collection khác
        const tickets = await Ticket.find()
            .populate('user_id')
            .populate('showtime_id')
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id');
        // DONE: Trả về danh sách vé đã được populate
        res.json(createResponse(200, null, tickets));
    } catch (error) {
        // ERROR: Lỗi khi lấy danh sách vé
        console.error('Get all tickets error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách vé', null));
    }
};

// ANCHOR: Lấy thông tin chi tiết của một vé theo ID
exports.getTicketById = async (req, res) => {
    try {
        const id = req.params.id;

        // VALIDATE: Kiểm tra ID vé có hợp lệ không
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID vé không hợp lệ', null));
        }

        // NOTE: Populate để lấy thông tin chi tiết từ các collection liên quan
        const ticket = await Ticket.findById(id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id');

        // WARNING: Xử lý trường hợp không tìm thấy vé
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        // DONE: Trả về thông tin vé
        res.json(createResponse(200, null, ticket));
    } catch (error) {
        // ERROR: Lỗi khi lấy thông tin vé
        console.error('Get ticket by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin vé', null));
    }
};

// ANCHOR: Tạo vé mới trong hệ thống quản trị
exports.createTicket = async (req, res) => {
    try {
        const { ticket_id, user_id, showtime_id, seats, combos, voucher_id, total_amount } = req.body;

        // VALIDATE: Kiểm tra đầy đủ thông tin
        // IMPORTANT: Các trường bắt buộc không được thiếu
        if (!ticket_id || !user_id || !showtime_id || !seats || !total_amount) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // VALIDATE: Kiểm tra mã vé đã tồn tại
        const existingTicket = await Ticket.findOne({ ticket_id });
        if (existingTicket) {
            return res.status(400).json(createResponse(400, 'Mã vé đã tồn tại', null));
        }

        // VALIDATE: Kiểm tra người dùng
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
        }

        // VALIDATE: Kiểm tra suất chiếu
        if (!mongoose.Types.ObjectId.isValid(showtime_id)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        // VALIDATE: Kiểm tra combo
        if (combos && combos.length > 0) {
            for (const combo of combos) {
                if (!mongoose.Types.ObjectId.isValid(combo.combo_id)) {
                    return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
                }
                if (!combo.quantity || combo.quantity < 1) {
                    return res.status(400).json(createResponse(400, 'Số lượng combo phải lớn hơn 0', null));
                }
            }
        }

        // VALIDATE: Kiểm tra voucher
        if (voucher_id && !mongoose.Types.ObjectId.isValid(voucher_id)) {
            return res.status(400).json(createResponse(400, 'ID voucher không hợp lệ', null));
        }

        // ANCHOR: Tạo vé mới sau khi đã kiểm tra các điều kiện
        const newTicket = new Ticket({
            ticket_id,
            user_id,
            showtime_id,
            seats,
            combos: combos || [],
            voucher_id,
            total_amount
        });

        // DONE: Lưu vé vào database và trả về kết quả
        const savedTicket = await newTicket.save();
        const populatedTicket = await Ticket.findById(savedTicket._id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id');

        res.status(201).json(createResponse(201, 'Tạo vé thành công', populatedTicket));
    } catch (error) {
        // ERROR: Lỗi khi tạo vé
        console.error('Create ticket error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo vé', null));
    }
};

// ANCHOR: Cập nhật thông tin vé
exports.updateTicket = async (req, res) => {
    try {
        const { combos, voucher_id, total_amount, status } = req.body;
        const id = req.params.id;

        // VALIDATE: Kiểm tra ID vé hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID vé không hợp lệ', null));
        }

        // VALIDATE: Kiểm tra vé tồn tại
        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        // VALIDATE: Kiểm tra combo hợp lệ nếu có
        if (combos) {
            for (const combo of combos) {
                if (!mongoose.Types.ObjectId.isValid(combo.combo_id)) {
                    return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
                }
                if (!combo.quantity || combo.quantity < 1) {
                    return res.status(400).json(createResponse(400, 'Số lượng combo phải lớn hơn 0', null));
                }
            }
            ticket.combos = combos;
        }

        // VALIDATE: Kiểm tra voucher hợp lệ nếu có
        if (voucher_id) {
            if (!mongoose.Types.ObjectId.isValid(voucher_id)) {
                return res.status(400).json(createResponse(400, 'ID voucher không hợp lệ', null));
            }
            ticket.voucher_id = voucher_id;
        }

        // UPDATE: Cập nhật thông tin vé
        if (total_amount !== undefined) {
            ticket.total_amount = total_amount;
        }

        // IMPORTANT: Cập nhật trạng thái vé
        if (status) {
            ticket.status = status;
        }

        // DONE: Lưu vé đã cập nhật và trả về kết quả
        const updatedTicket = await ticket.save();
        const populatedTicket = await Ticket.findById(updatedTicket._id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id');

        res.json(createResponse(200, 'Cập nhật vé thành công', populatedTicket));
    } catch (error) {
        // ERROR: Lỗi khi cập nhật vé
        console.error('Update ticket error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật vé', null));
    }
};

// ANCHOR: Xóa vé khỏi hệ thống
exports.deleteTicket = async (req, res) => {
    try {
        const id = req.params.id;

        // VALIDATE: Kiểm tra ID vé hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID vé không hợp lệ', null));
        }

        // VALIDATE: Kiểm tra vé tồn tại
        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        // WARNING: Thực hiện xóa vé - thao tác này không thể hoàn tác
        await Ticket.deleteOne({ _id: id });
        
        // DONE: Trả về kết quả xóa vé
        res.json(createResponse(200, 'Xóa vé thành công', null));
    } catch (error) {
        // ERROR: Lỗi khi xóa vé
        console.error('Delete ticket error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa vé', null));
    }
};
// END-SECTION

// SECTION: Đặt vé từ ứng dụng di động
// ANCHOR: API đặt vé dành cho mobile app
exports.bookTicket = async (req, res) => {
    try {
        const { user_id, movie_id, cinema_id, room_id, showtime_id, seat_ids, total_amount } = req.body;

        // VALIDATE: Kiểm tra các trường bắt buộc
        // IMPORTANT: Đầy đủ thông tin là rất quan trọng cho việc đặt vé
        if (!user_id || !movie_id || !cinema_id || !room_id || !showtime_id || !seat_ids || !Array.isArray(seat_ids)) {
            return res.status(400).json({
                status: false,
                message: 'Thiếu thông tin đặt vé',
                data: null
            });
        }

        // NOTE: Tạo mã vé ngẫu nhiên dựa trên thời gian hiện tại
        const ticket_id = 'TIX' + Date.now();

        // STUB: Tạo mảng ghế với giá
        // TODO: Cần cập nhật giá ghế từ dữ liệu thực tế
        const seats = seat_ids.map(seat_id => ({
            seat_id: seat_id,
            price: 0 // Giá sẽ được cập nhật sau khi lấy thông tin ghế
        }));

        // ANCHOR: Tạo vé mới với trạng thái chờ thanh toán
        const newTicket = new Ticket({
            ticket_id,
            user_id,
            showtime_id,
            seats,
            total_amount: total_amount || 0,
            status: 'pending'
        });

        // DONE: Lưu vé vào cơ sở dữ liệu
        const savedTicket = await newTicket.save();

        // NOTE: Lấy thông tin đầy đủ của vé đã đặt
        const populatedTicket = await Ticket.findById(savedTicket._id)
            .populate('user_id', 'user_name email phone_number')
            .populate({
                path: 'showtime_id',
                populate: {
                    path: 'movie_id',
                    select: 'title image_film duration'
                }
            })
            .populate('seats.seat_id', 'seat_type row_of_seat column_of_seat price_seat');

        // HIGHLIGHT: Format response theo chuẩn API cho mobile app
        const response = [{
            ticket_id: populatedTicket.ticket_id,
            movie_name: populatedTicket.showtime_id.movie_id.title,
            movie_image: populatedTicket.showtime_id.movie_id.image_film,
            duration: populatedTicket.showtime_id.movie_id.duration,
            showtime: populatedTicket.showtime_id.start_time,
            seats: populatedTicket.seats.map(seat => ({
                seat_name: `${seat.seat_id.row_of_seat}${seat.seat_id.column_of_seat}`,
                seat_type: seat.seat_id.seat_type
            })),
            total_amount: populatedTicket.total_amount,
            status: populatedTicket.status,
            booking_time: populatedTicket.createdAt
        }];

        // DONE: Trả về kết quả đặt vé thành công
        res.status(201).json({
            status: true,
            message: 'Đặt vé thành công',
            data: response
        });

    } catch (error) {
        // ERROR: Lỗi khi đặt vé
        console.error('Book ticket error:', error);
        res.status(500).json({
            status: false,
            message: 'Lỗi khi đặt vé',
            data: null
        });
    }
};

// ANCHOR: Thêm vé mới với mã tự động sinh
exports.addTicket = async (req, res) => {
    try {
        const { user_id, showtime_id, seats, combos, voucher_id, total_amount } = req.body;

        // VALIDATE: Kiểm tra đầy đủ thông tin
        if (!user_id || !showtime_id || !seats || !total_amount) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // IDEA: Tạo mã vé ngẫu nhiên kết hợp thời gian và ký tự ngẫu nhiên để đảm bảo tính duy nhất
        const ticket_id = 'TIX' + Date.now() + Math.random().toString(36).substring(2, 10).toUpperCase();

        // VALIDATE: Kiểm tra mã vé đã tồn tại (mặc dù khả năng rất thấp)
        const existingTicket = await Ticket.findOne({ ticket_id });
        if (existingTicket) {
            return res.status(400).json(createResponse(400, 'Mã vé đã tồn tại', null));
        }

        // VALIDATE: Kiểm tra người dùng tồn tại
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
        }

        // VALIDATE: Kiểm tra suất chiếu tồn tại
        if (!mongoose.Types.ObjectId.isValid(showtime_id)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        // VALIDATE: Kiểm tra combo hợp lệ nếu có
        if (combos && combos.length > 0) {
            for (const combo of combos) {
                if (!mongoose.Types.ObjectId.isValid(combo.combo_id)) {
                    return res.status(400).json(createResponse(400, 'ID combo không hợp lệ', null));
                }
                if (!combo.quantity || combo.quantity < 1) {
                    return res.status(400).json(createResponse(400, 'Số lượng combo phải lớn hơn 0', null));
                }
            }
        }

        // VALIDATE: Kiểm tra voucher hợp lệ nếu có
        if (voucher_id && !mongoose.Types.ObjectId.isValid(voucher_id)) {
            return res.status(400).json(createResponse(400, 'ID voucher không hợp lệ', null));
        }

        // ANCHOR: Tạo đối tượng vé mới
        const newTicket = new Ticket({
            ticket_id,
            user_id,
            showtime_id,
            seats,
            combos: combos || [],
            voucher_id,
            total_amount
        });

        // DONE: Lưu vé và trả về thông tin đầy đủ
        const savedTicket = await newTicket.save();
        const populatedTicket = await Ticket.findById(savedTicket._id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id');

        res.status(201).json(createResponse(201, 'Thêm vé thành công', populatedTicket));
    } catch (error) {
        // ERROR: Lỗi khi thêm vé
        console.error('Add ticket error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi thêm vé', null));
    }
};
// END-SECTION