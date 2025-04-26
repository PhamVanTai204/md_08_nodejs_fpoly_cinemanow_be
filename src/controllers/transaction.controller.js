const Ticket = require('../models/ticket');
const Film = require('../models/film');
const Seat = require('../models/seat');
const Room = require('../models/room');
const Cinema = require('../models/cinema');
const ShowTime = require('../models/showTime');
const Payment = require('../models/payment');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy lịch sử đặt vé của người dùng
exports.getTransactionsByUser = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Kiểm tra user_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json(createResponse(400, 'ID người dùng không hợp lệ', null));
        }

        // Tìm tất cả vé của user và populate thông tin cần thiết
        const tickets = await Ticket.find({ user_id })
            .populate({
                path: 'showtime_id',
                populate: [{
                    path: 'movie_id'
                }, {
                    path: 'room_id',
                    populate: {
                        path: 'cinema_id'
                    }
                }]
            })
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id')
            .sort({ createdAt: -1 });

        // Lấy thông tin thanh toán cho mỗi vé
        const ticketIds = tickets.map(ticket => ticket._id);
        const payments = await Payment.find({
            ticket_id: { $in: ticketIds }
        }).populate('payment_method_id');

        const paymentMap = new Map(payments.map(p => [p.ticket_id.toString(), p]));

        // Định dạng lại dữ liệu đơn giản hơn
        const simplifiedTickets = tickets.map(ticket => {
            const payment = paymentMap.get(ticket._id.toString());
            const seats = ticket.seats.map(seat => seat.seat_id.seat_id).join(', ');
            const combos = ticket.combos.map(combo => 
                `${combo.combo_id.name_combo} x${combo.quantity}`
            ).join(', ');

            return {
                id: ticket._id,
                ticket_code: ticket.ticket_id,
                movie_name: ticket.showtime_id?.movie_id?.title || 'Chưa có phim',
                movie_poster: ticket.showtime_id?.movie_id?.image_film || '',
                cinema_name: ticket.showtime_id?.room_id?.cinema_id?.cinema_name || 'Chưa có rạp',
                room_name: ticket.showtime_id?.room_id?.room_name || 'Chưa có phòng',
                show_date: ticket.showtime_id?.show_date || 'Chưa có ngày chiếu',
                show_time: ticket.showtime_id?.start_time || 'Chưa có giờ chiếu',
                seats: seats || 'Chưa có ghế',
                combos: combos || 'Không có combo',
                total_amount: ticket.total_amount || 0,
                booking_date: ticket.createdAt,
                payment_status: payment ? payment.status_order : 'Chưa thanh toán',
                payment_method: payment?.payment_method_id?.name || 'Chưa thanh toán'
            };
        });

        res.json(createResponse(200, null, simplifiedTickets));
    } catch (error) {
        console.error('Get user transactions error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy lịch sử đặt vé', null));
    }
};

// Tạo vé mới tại quầy
exports.createTicket = async (req, res) => {
    try {
        const { 
            user_id, 
            showtime_id,
            seats,
            combos = [],
            voucher_id = null,
            total_amount 
        } = req.body;

        console.log('Bắt đầu quá trình tạo vé...');
        console.log('Dữ liệu nhận được:', { user_id, showtime_id, seats, combos, voucher_id, total_amount });

        // 1. Kiểm tra showtime tồn tại và lấy thông tin
        const showtime = await ShowTime.findById(showtime_id)
            .populate('movie_id')
            .populate({
                path: 'room_id',
                populate: {
                    path: 'cinema_id'
                }
            });

        if (!showtime) {
            console.log('Lỗi: Suất chiếu không tồn tại');
            return res.status(404).json(createResponse(404, 'Suất chiếu không tồn tại', null));
        }

        console.log('Thông tin suất chiếu:', {
            movie: showtime.movie_id.title,
            room: showtime.room_id.room_name,
            cinema: showtime.room_id.cinema_id.cinema_name,
            date: showtime.show_date,
            time: showtime.start_time
        });

        // 2. Kiểm tra phim tồn tại
        if (!showtime.movie_id) {
            console.log('Lỗi: Phim không tồn tại');
            return res.status(404).json(createResponse(404, 'Phim không tồn tại', null));
        }

        // 3. Kiểm tra phòng tồn tại
        if (!showtime.room_id) {
            console.log('Lỗi: Phòng chiếu không tồn tại');
            return res.status(404).json(createResponse(404, 'Phòng chiếu không tồn tại', null));
        }

        // 4. Kiểm tra rạp tồn tại
        if (!showtime.room_id.cinema_id) {
            console.log('Lỗi: Rạp chiếu không tồn tại');
            return res.status(404).json(createResponse(404, 'Rạp chiếu không tồn tại', null));
        }

        // 5. Kiểm tra tất cả ghế có tồn tại và thuộc phòng đó không
        const seatIds = seats.map(seat => seat.seat_id);
        const existingSeats = await Seat.find({
            _id: { $in: seatIds },
            room_id: showtime.room_id._id
        });

        if (existingSeats.length !== seats.length) {
            console.log('Lỗi: Một số ghế không tồn tại hoặc không thuộc phòng này');
            return res.status(400).json(createResponse(400, 'Một số ghế không tồn tại hoặc không thuộc phòng này', null));
        }

        // 6. Kiểm tra xem ghế đã được đặt chưa (bất kể người dùng nào)
        const bookedSeats = await Ticket.find({
            showtime_id,
            'seats.seat_id': { $in: seatIds }
        });

        if (bookedSeats.length > 0) {
            console.log('Lỗi: Một số ghế đã được đặt bởi người khác');
            const bookedSeatIds = bookedSeats.flatMap(ticket => 
                ticket.seats.map(seat => seat.seat_id.toString())
            );
            
            // Lấy thông tin chi tiết của các ghế đã được đặt
            const bookedSeatDetails = existingSeats
                .filter(seat => bookedSeatIds.includes(seat._id.toString()))
                .map(seat => seat.seat_id)
                .join(', ');
                
            return res.status(400).json(createResponse(400, `Ghế ${bookedSeatDetails} đã được đặt bởi người khác`, null));
        }

        // 7. Tạo vé mới
        const ticketData = {
            user_id,
            showtime_id,
            seats: seats.map(seat => ({
                seat_id: seat.seat_id,
                price: seat.price
            })),
            combos,
            voucher_id,
            total_amount,
            status: 'pending', // Trạng thái chờ thanh toán
            ticket_id: `TICKET${Date.now()}` // Tạo mã vé unique
        };

        const newTicket = await Ticket.create(ticketData);

        console.log('Tạo vé thành công:', {
            ticket_id: newTicket.ticket_id,
            total_amount: newTicket.total_amount,
            status: newTicket.status,
            seats: existingSeats.map(seat => seat.seat_id).join(', ')
        });

        res.status(201).json(createResponse(201, null, newTicket));
    } catch (error) {
        console.error('Lỗi khi tạo vé:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo vé', null));
    }
}; 