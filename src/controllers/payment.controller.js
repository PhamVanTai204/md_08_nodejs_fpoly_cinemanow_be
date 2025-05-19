const mongoose = require('mongoose');
const Payment = require('../models/payment');
const Ticket = require('../models/ticket');
const createResponse = require('../utils/responseHelper');
const Seat = require('../models/seat');

// SECTION: API quản lý thanh toán vé xem phim

// ANCHOR: Xử lý hành động thanh toán (xác nhận hoặc hủy)
exports.processPaymentAction = async (req, res) => {
    try {
        const { payment_id, action } = req.body;

        // IMPORTANT: Kiểm tra tham số action hợp lệ
        if (![0, 1].includes(Number(action))) {
            return res.status(400).json(createResponse(400, 'Tham số action không hợp lệ (0 = xác nhận, 1 = hủy)'));
        }

        // NOTE: Tìm thanh toán theo ID và populate thông tin vé liên quan
        const payment = await Payment.findOne({ _id: payment_id }).populate('ticket_id');
        if (!payment) return res.status(404).json(createResponse(404, 'Không tìm thấy thanh toán'));

        // WARNING: Kiểm tra trạng thái thanh toán có phù hợp để xử lý không
        if (payment.status_order !== 'pending') {
            return res.status(400).json(createResponse(400, 'Thanh toán đã được xử lý'));
        }

        // NOTE: Tìm vé liên kết với thanh toán
        const ticket = await Ticket.findById(payment.ticket_id._id).populate('seats.seat_id');
        if (!ticket) return res.status(404).json(createResponse(404, 'Không tìm thấy vé liên kết'));

        // SECTION: Xử lý theo loại hành động
        if (action === 0) {
            // HIGHLIGHT: Xác nhận thanh toán
            payment.status_order = 'completed';
            ticket.status = 'confirmed';

            // IMPORTANT: Cập nhật trạng thái các ghế thành đã đặt
            const seatUpdatePromises = ticket.seats.map(seatObj =>
                Seat.findByIdAndUpdate(seatObj.seat_id._id, { seat_status: 'booked' })
            );
            await Promise.all(seatUpdatePromises);

        } else if (action === 1) {
            // HIGHLIGHT: Hủy thanh toán
            payment.status_order = 'cancelled';
            ticket.status = 'cancelled';

            // NOTE: Không cập nhật ghế khi hủy thanh toán
        }

        // DONE: Lưu thay đổi vào cơ sở dữ liệu
        await payment.save();
        await ticket.save();

        // NOTE: Trả về kết quả thành công với text tương ứng với hành động
        const actionText = action === 0 ? 'Xác nhận' : 'Hủy';
        res.status(200).json(createResponse(200, `${actionText} thanh toán thành công`));
    } catch (error) {
        console.error(error);
        res.status(500).json(createResponse(500, 'Lỗi xử lý thanh toán', error.message));
    }
};

// ANCHOR: Thêm mới thanh toán
exports.addPayment = async (req, res) => {
    try {
        const { ticket_id } = req.body;

        // IMPORTANT: Kiểm tra vé tồn tại
        const ticket = await Ticket.findById(ticket_id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé với ticket_id được cung cấp.'));
        }

        // NOTE: Tạo mã thanh toán dựa trên thời gian hiện tại
        const payment_id = 'PAY' + Date.now();

        // HIGHLIGHT: Tạo thời gian thanh toán theo giờ Việt Nam (+7 UTC)
        const nowUtc = new Date();
        const vnp_PayDate = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);

        // NOTE: Tạo đối tượng thanh toán mới
        const newPayment = new Payment({
            payment_id,
            ticket_id,
            payment_method: 0,       // Mặc định tiền mặt
            status_order: 'pending', // Mặc định trạng thái
            vnp_PayDate
        });

        // DONE: Lưu thanh toán vào cơ sở dữ liệu
        await newPayment.save();

        // NOTE: Populate thông tin vé để trả về chi tiết đầy đủ
        const populatedTicket = await Ticket.findById(ticket_id)
            .populate('user_id')
            .populate({
                path: 'showtime_id',
                populate: {
                    path: 'room_id' // NOTE: Populate thêm room tại đây
                }
            })
            .populate('voucher_id')
            .populate('seats.seat_id');

        res.status(201).json(createResponse(201, 'Thêm thanh toán thành công', {
            ...newPayment.toObject(),
            ticket: populatedTicket
        }));
    } catch (error) {
        console.error(error);
        res.status(500).json(createResponse(500, 'Lỗi khi thêm thanh toán', error.message));
    }
};

// ANCHOR: Lấy danh sách thanh toán với phân trang và tìm kiếm
exports.getAllPayments = async (req, res) => {
    try {
        // Xử lý tham số phân trang và tìm kiếm
        let { page, limit, search } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Sử dụng MongoDB Aggregation Framework
        const aggregate = Payment.aggregate([
            // Join với bảng tickets
            {
                $lookup: {
                    from: 'tickets',
                    localField: 'ticket_id',
                    foreignField: '_id',
                    as: 'ticket'
                }
            },
            { $unwind: '$ticket' },

            // Join với bảng users
            {
                $lookup: {
                    from: 'users',
                    localField: 'ticket.user_id',
                    foreignField: '_id',
                    as: 'ticket.user'
                }
            },
            { $unwind: '$ticket.user' },

            // Join với bảng showtimes
            {
                $lookup: {
                    from: 'showtimes',
                    localField: 'ticket.showtime_id',
                    foreignField: '_id',
                    as: 'ticket.showtime'
                }
            },
            { $unwind: '$ticket.showtime' },

            // Join với bảng films (movies)
            {
                $lookup: {
                    from: 'films', // hoặc 'movies' tùy theo tên collection của bạn
                    localField: 'ticket.showtime.movie_id',
                    foreignField: '_id',
                    as: 'ticket.showtime.movie'
                }
            },
            { $unwind: '$ticket.showtime.movie' },

            // Join với bảng rooms
            {
                $lookup: {
                    from: 'rooms',
                    localField: 'ticket.showtime.room_id',
                    foreignField: '_id',
                    as: 'ticket.showtime.room'
                }
            },
            { $unwind: '$ticket.showtime.room' },

            // Join với bảng cinemas (thông qua room)
            {
                $lookup: {
                    from: 'cinemas',
                    localField: 'ticket.showtime.room.cinema_id',
                    foreignField: '_id',
                    as: 'ticket.showtime.room.cinema'
                }
            },
            { $unwind: '$ticket.showtime.room.cinema' },

            // Join với bảng seats
            {
                $lookup: {
                    from: 'seats',
                    localField: 'ticket.seats.seat_id',
                    foreignField: '_id',
                    as: 'ticket.seatDetails'
                }
            },

            // Join với bảng combos
            {
                $lookup: {
                    from: 'combos',
                    localField: 'ticket.combos.combo_id',
                    foreignField: '_id',
                    as: 'ticket.comboDetails'
                }
            },

            // Lọc theo điều kiện tìm kiếm
            {
                $match: search ? {
                    $or: [
                        { 'ticket.user.email': { $regex: search, $options: 'i' } },
                        { 'payment_id': { $regex: search, $options: 'i' } },
                        { 'ticket.showtime.room.cinema.cinema_name': { $regex: search, $options: 'i' } },
                        { 'ticket.showtime.movie.title': { $regex: search, $options: 'i' } } // Thêm tìm kiếm theo tên phim
                    ]
                } : {}
            },

            // Sắp xếp từ mới nhất đến cũ nhất
            {
                $sort: { createdAt: -1 }
            },

            // Phân trang và tính tổng số bản ghi
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        // Projection để định dạng dữ liệu trả về
                        {
                            $project: {
                                _id: 1,
                                payment_id: 1,
                                payment_method: 1,
                                status_order: 1,
                                vnp_TransactionNo: 1,
                                vnp_ResponseCode: 1,
                                vnp_BankCode: 1,
                                vnp_PayDate: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                ticket: {
                                    _id: '$ticket._id',
                                    ticket_id: '$ticket.ticket_id',
                                    total_amount: '$ticket.total_amount',
                                    status: '$ticket.status',
                                    createdAt: '$ticket.createdAt',
                                    updatedAt: '$ticket.updatedAt',
                                    user: '$ticket.user',
                                    showtime: {
                                        _id: '$ticket.showtime._id',
                                        showtime_id: '$ticket.showtime.showtime_id',
                                        start_time: '$ticket.showtime.start_time',
                                        end_time: '$ticket.showtime.end_time',
                                        show_date: '$ticket.showtime.show_date',
                                        movie: { // Thêm thông tin phim
                                            _id: '$ticket.showtime.movie._id',
                                            title: '$ticket.showtime.movie.title',
                                            image_film: '$ticket.showtime.movie.image_film',
                                            duration: '$ticket.showtime.movie.duration',
                                            age_limit: '$ticket.showtime.movie.age_limit'
                                        },
                                        room: {
                                            _id: '$ticket.showtime.room._id',
                                            room_name: '$ticket.showtime.room.room_name',
                                            room_style: '$ticket.showtime.room.room_style',
                                            cinema: '$ticket.showtime.room.cinema'
                                        }
                                    },
                                    seats: {
                                        $map: {
                                            input: '$ticket.seats',
                                            as: 'seat',
                                            in: {
                                                seat_id: '$$seat.seat_id',
                                                price: '$$seat.price',
                                                seatDetails: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: '$ticket.seatDetails',
                                                                as: 'sd',
                                                                cond: { $eq: ['$$sd._id', '$$seat.seat_id'] }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    combos: {
                                        $map: {
                                            input: '$ticket.combos',
                                            as: 'combo',
                                            in: {
                                                combo_id: '$$combo.combo_id',
                                                name_combo: '$$combo.name_combo',
                                                quantity: '$$combo.quantity',
                                                price: '$$combo.price',
                                                comboDetails: {
                                                    $arrayElemAt: [
                                                        {
                                                            $filter: {
                                                                input: '$ticket.comboDetails',
                                                                as: 'cd',
                                                                cond: { $eq: ['$$cd._id', '$$combo.combo_id'] }
                                                            }
                                                        },
                                                        0
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    voucher_id: '$ticket.voucher_id'
                                }
                            }
                        }
                    ],
                    total: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        // Thực thi truy vấn
        const result = await aggregate.exec();

        // Xử lý kết quả
        const payments = result[0].data;
        const totalPayments = result[0].total[0]?.count || 0;
        const totalPages = Math.ceil(totalPayments / limit);

        // Trả về kết quả
        res.status(200).json(createResponse(200, null, {
            payments,
            totalPayments,
            totalPages,
            currentPage: page,
            pageSize: limit
        }));
    } catch (error) {
        console.error(error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách thanh toán', error.message));
    }
};

// TODO: Thêm API thống kê thanh toán theo phương thức
// TODO: Thêm API lọc thanh toán theo khoảng thời gian
// IDEA: Tích hợp các cổng thanh toán trực tuyến như VNPay, Momo...
// OPTIMIZE: Cải thiện hiệu suất truy vấn khi dữ liệu lớn