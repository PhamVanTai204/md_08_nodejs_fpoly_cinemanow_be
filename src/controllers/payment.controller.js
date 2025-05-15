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
        // NOTE: Xử lý tham số phân trang và tìm kiếm
        let { page, limit, search } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // HIGHLIGHT: Sử dụng MongoDB Aggregation Framework để lấy dữ liệu phức tạp
        const aggregate = Payment.aggregate([
            // SECTION: Join với bảng tickets
            {
                $lookup: {
                    from: 'tickets',
                    localField: 'ticket_id',
                    foreignField: '_id',
                    as: 'ticket'
                }
            },
            { $unwind: '$ticket' },
            // SECTION: Join với bảng users
            {
                $lookup: {
                    from: 'users',
                    localField: 'ticket.user_id',
                    foreignField: '_id',
                    as: 'ticket.user'
                }
            },
            { $unwind: '$ticket.user' },
            // SECTION: Lọc theo điều kiện tìm kiếm nếu có
            {
                $match: search ? { 'ticket.user.email': { $regex: search, $options: 'i' } } : {}
            },
            // NOTE: Sắp xếp từ mới nhất đến cũ nhất
            {
                $sort: { createdAt: -1 }
            },
            // SECTION: Phân trang và tính tổng số bản ghi
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

        // DONE: Thực thi truy vấn
        const result = await aggregate.exec();

        // NOTE: Xử lý kết quả để trả về
        const payments = result[0].data;
        const totalPayments = result[0].total[0]?.count || 0;
        const totalPages = Math.ceil(totalPayments / limit);

        // NOTE: Trả về kết quả với thông tin phân trang
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