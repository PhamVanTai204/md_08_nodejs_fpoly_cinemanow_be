const Ticket = require('../models/ticket');
const User = require('../models/user');
const ShowTime = require('../models/showTime');
const Voucher = require('../models/voucher');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy tất cả vé
exports.getAllTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find()
            .populate('user_id')
            .populate('showtime_id')
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id');
        res.json(createResponse(200, null, tickets));
    } catch (error) {
        console.error('Get all tickets error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách vé', null));
    }
};

// Lấy vé theo ID
exports.getTicketById = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID vé không hợp lệ', null));
        }

        const ticket = await Ticket.findById(id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id');

        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        res.json(createResponse(200, null, ticket));
    } catch (error) {
        console.error('Get ticket by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin vé', null));
    }
};

// Tạo vé mới
exports.createTicket = async (req, res) => {
    try {
        const { ticket_id, user_id, showtime_id, seats, combos, voucher_id, total_amount } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!ticket_id || !user_id || !showtime_id || !seats || !total_amount) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra ticket_id đã tồn tại
        const existingTicket = await Ticket.findOne({ ticket_id });
        if (existingTicket) {
            return res.status(400).json(createResponse(400, 'Mã vé đã tồn tại', null));
        }

        // Kiểm tra user tồn tại
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
        }

        // Kiểm tra showtime tồn tại
        if (!mongoose.Types.ObjectId.isValid(showtime_id)) {
            return res.status(400).json(createResponse(400, 'ID suất chiếu không hợp lệ', null));
        }

        // Kiểm tra combo tồn tại nếu có
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

        // Kiểm tra voucher tồn tại nếu có
        if (voucher_id && !mongoose.Types.ObjectId.isValid(voucher_id)) {
            return res.status(400).json(createResponse(400, 'ID voucher không hợp lệ', null));
        }

        const newTicket = new Ticket({
            ticket_id,
            user_id,
            showtime_id,
            seats,
            combos: combos || [],
            voucher_id,
            total_amount
        });

        const savedTicket = await newTicket.save();
        const populatedTicket = await Ticket.findById(savedTicket._id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id');

        res.status(201).json(createResponse(201, 'Tạo vé thành công', populatedTicket));
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo vé', null));
    }
};

// Cập nhật vé
exports.updateTicket = async (req, res) => {
    try {
        const { combos, voucher_id, total_amount, status } = req.body;
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID vé không hợp lệ', null));
        }

        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        if (combos) {
            // Kiểm tra combo hợp lệ
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

        if (voucher_id) {
            if (!mongoose.Types.ObjectId.isValid(voucher_id)) {
                return res.status(400).json(createResponse(400, 'ID voucher không hợp lệ', null));
            }
            ticket.voucher_id = voucher_id;
        }

        if (total_amount !== undefined) {
            ticket.total_amount = total_amount;
        }

        if (status) {
            ticket.status = status;
        }

        const updatedTicket = await ticket.save();
        const populatedTicket = await Ticket.findById(updatedTicket._id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id');

        res.json(createResponse(200, 'Cập nhật vé thành công', populatedTicket));
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật vé', null));
    }
};

// Xóa vé
exports.deleteTicket = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID vé không hợp lệ', null));
        }

        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        await Ticket.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa vé thành công', null));
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa vé', null));
    }
};

// Đặt vé từ mobile app
exports.bookTicket = async (req, res) => {
    try {
        const { user_id, movie_id, cinema_id, room_id, showtime_id, seat_ids, total_amount } = req.body;

        // Kiểm tra các trường bắt buộc
        if (!user_id || !movie_id || !cinema_id || !room_id || !showtime_id || !seat_ids || !Array.isArray(seat_ids)) {
            return res.status(400).json({
                status: false,
                message: 'Thiếu thông tin đặt vé',
                data: null
            });
        }

        // Tạo mã vé ngẫu nhiên
        const ticket_id = 'TIX' + Date.now();

        // Tạo mảng ghế với giá
        const seats = seat_ids.map(seat_id => ({
            seat_id: seat_id,
            price: 0 // Giá sẽ được cập nhật sau khi lấy thông tin ghế
        }));

        // Tạo vé mới
        const newTicket = new Ticket({
            ticket_id,
            user_id,
            showtime_id,
            seats,
            total_amount: total_amount || 0,
            status: 'pending'
        });

        // Lưu vé
        const savedTicket = await newTicket.save();

        // Lấy thông tin đầy đủ của vé
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

        // Format response theo yêu cầu
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

        res.status(201).json({
            status: true,
            message: 'Đặt vé thành công',
            data: response
        });

    } catch (error) {
        console.error('Book ticket error:', error);
        res.status(500).json({
            status: false,
            message: 'Lỗi khi đặt vé',
            data: null
        });
    }
}; 