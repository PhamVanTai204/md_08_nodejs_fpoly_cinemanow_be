const mongoose = require('mongoose');
const Payment = require('../models/payment');
const Ticket = require('../models/ticket');
const createResponse = require('../utils/responseHelper');
const Seat = require('../models/seat');

exports.processPaymentAction = async (req, res) => {
    try {
        const { payment_id, action } = req.body;

        if (![0, 1].includes(Number(action))) {
            return res.status(400).json(createResponse(400, 'Tham số action không hợp lệ (0 = xác nhận, 1 = hủy)'));
        }

        const payment = await Payment.findOne({ _id: payment_id }).populate('ticket_id');
        if (!payment) return res.status(404).json(createResponse(404, 'Không tìm thấy thanh toán'));

        if (payment.status_order !== 'pending') {
            return res.status(400).json(createResponse(400, 'Thanh toán đã được xử lý'));
        }

        const ticket = await Ticket.findById(payment.ticket_id._id).populate('seats.seat_id');
        if (!ticket) return res.status(404).json(createResponse(404, 'Không tìm thấy vé liên kết'));

        if (action === 0) {
            // ✅ Xác nhận
            payment.status_order = 'completed';
            ticket.status = 'confirmed';

            // Cập nhật trạng thái các ghế
            const seatUpdatePromises = ticket.seats.map(seatObj =>
                Seat.findByIdAndUpdate(seatObj.seat_id._id, { seat_status: 'booked' })
            );
            await Promise.all(seatUpdatePromises);

        } else if (action === 1) {
            // ❌ Hủy
            payment.status_order = 'cancelled';
            ticket.status = 'cancelled';

            // Không cập nhật ghế
        }

        await payment.save();
        await ticket.save();

        const actionText = action === 0 ? 'Xác nhận' : 'Hủy';
        res.status(200).json(createResponse(200, `${actionText} thanh toán thành công`));
    } catch (error) {
        console.error(error);
        res.status(500).json(createResponse(500, 'Lỗi xử lý thanh toán', error.message));
    }
};

exports.addPayment = async (req, res) => {
    try {
        const { ticket_id } = req.body;

        // Kiểm tra xem ticket có tồn tại không
        const ticket = await Ticket.findById(ticket_id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé với ticket_id được cung cấp.'));
        }

        // Tạo mã payment_id
        const payment_id = 'PAY' + Date.now();


        // 👉 Tạo thời gian thanh toán theo giờ Việt Nam bằng cách cộng thêm 7 giờ vào UTC
        const nowUtc = new Date();
        const vnp_PayDate = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);

        const newPayment = new Payment({
            payment_id,
            ticket_id,
            payment_method: 0,       // Mặc định tiền mặt
            status_order: 'pending', // Mặc định trạng thái
            vnp_PayDate
        });

        await newPayment.save();
        // Populate lại vé để trả về chi tiết
        const populatedTicket = await Ticket.findById(ticket_id)
            .populate('user_id')
            .populate({
                path: 'showtime_id',
                populate: {
                    path: 'room_id' // 💡 Populate thêm room tại đây
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

exports.getAllPayments = async (req, res) => {
    try {
        let { page, limit, search } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        const matchStage = {};

        if (search) {
            matchStage['ticket_id.user_id.email'] = { $regex: search, $options: 'i' };
        }

        // Aggregation pipeline cho phép tìm theo nested field (user.email)
        const aggregate = Payment.aggregate([
            {
                $lookup: {
                    from: 'tickets',
                    localField: 'ticket_id',
                    foreignField: '_id',
                    as: 'ticket'
                }
            },
            { $unwind: '$ticket' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'ticket.user_id',
                    foreignField: '_id',
                    as: 'ticket.user'
                }
            },
            { $unwind: '$ticket.user' },
            {
                $match: search ? { 'ticket.user.email': { $regex: search, $options: 'i' } } : {}
            },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    total: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const result = await aggregate.exec();

        const payments = result[0].data;
        const totalPayments = result[0].total[0]?.count || 0;
        const totalPages = Math.ceil(totalPayments / limit);

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


