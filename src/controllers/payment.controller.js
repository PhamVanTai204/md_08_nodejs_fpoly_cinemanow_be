const mongoose = require('mongoose');
const Payment = require('../models/payment');
const Ticket = require('../models/ticket');
const PaymentMethod = require('../models/paymentMethod');
const PaymentStatus = require('../models/paymentStatus');
const createResponse = require('../utils/responseHelper');

exports.getAllPayments = async (req, res) => {
    try {
        let { page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy danh sách thanh toán có phân trang với nested populate
        const payments = await Payment.find()
            .populate({
                path: 'ticket_id',
                populate: [
                    {
                        path: 'showtime_id',
                        populate: [
                            { path: 'movie_id' },  // Lấy thông tin phim từ showtime
                            { path: 'room_id' }    // Lấy thông tin phòng từ showtime
                        ]
                    },
                    { path: 'user_id' }            // Lấy thông tin user từ ticket
                ]
            })
            .populate('payment_method_id')
            .populate('payment_status_id')
            .skip(skip)
            .limit(limit);

        // Đếm tổng số thanh toán để phân trang
        const totalPayments = await Payment.countDocuments();
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




// Xác nhận thanh toán
exports.confirmPayment = async (req, res) => {
    const { payment_id } = req.body;

    if (!payment_id || !mongoose.Types.ObjectId.isValid(payment_id)) {
        return res.status(400).json(createResponse(400, 'ID thanh toán không hợp lệ', null));
    }

    try {
        const payment = await Payment.findById(payment_id);
        if (!payment) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thanh toán', null));
        }

        const confirmedStatus = await PaymentStatus.findOne({ name: 'confirmed' });
        if (!confirmedStatus) {
            return res.status(500).json(createResponse(500, 'Không tìm thấy trạng thái confirmed', null));
        }

        payment.payment_status_id = confirmedStatus._id;
        payment.status_order = 'confirmed';
        await payment.save();

        const result = await Payment.findById(payment._id)
            .populate('ticket_id')
            .populate('payment_method_id')
            .populate('payment_status_id');

        res.json(createResponse(200, 'Xác nhận thanh toán thành công', result));
    } catch (err) {
        console.error(err);
        res.status(500).json(createResponse(500, 'Lỗi khi xác nhận thanh toán', null));
    }
};

// Lấy thanh toán theo ID
exports.getPaymentById = async (req, res) => {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(createResponse(400, 'ID không hợp lệ', null));
    }

    try {
        const payment = await Payment.findById(id)
            .populate('ticket_id')
            .populate('payment_method_id')
            .populate('payment_status_id');
        if (!payment) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thanh toán', null));
        }
        res.json(createResponse(200, null, payment));
    } catch (err) {
        console.error(err);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thanh toán', null));
    }
};

// Tạo thanh toán mới
exports.createPayment = async (req, res) => {
    try {
        const { ticket_id, payment_method_id } = req.body;

        if (!ticket_id || !payment_method_id) {
            return res.status(400).json(createResponse(400, 'Thiếu thông tin thanh toán', null));
        }

        const ticket = await Ticket.findById(ticket_id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        const paymentMethod = await PaymentMethod.findById(payment_method_id);
        if (!paymentMethod) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phương thức thanh toán', null));
        }

        const pendingStatus = await PaymentStatus.findOne({ name: 'pending' });
        if (!pendingStatus) {
            return res.status(500).json(createResponse(500, 'Không tìm thấy trạng thái thanh toán', null));
        }

        const newPayment = new Payment({
            payment_id: 'PAY' + Date.now(),
            ticket_id,
            payment_method_id,
            payment_status_id: pendingStatus._id,
        });

        const saved = await newPayment.save();

        const result = await Payment.findById(saved._id)
            .populate('ticket_id')
            .populate('payment_method_id')
            .populate('payment_status_id');

        res.status(201).json(createResponse(201, 'Tạo thanh toán thành công', result));
    } catch (err) {
        console.error(err);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo thanh toán', null));
    }
};

// Cập nhật trạng thái hoặc phương thức thanh toán
exports.updatePayment = async (req, res) => {
    const { payment_method_id, payment_status_id } = req.body;
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(createResponse(400, 'ID không hợp lệ', null));
    }

    try {
        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thanh toán', null));
        }

        if (payment_method_id && mongoose.Types.ObjectId.isValid(payment_method_id)) {
            payment.payment_method_id = payment_method_id;
        }

        if (payment_status_id && mongoose.Types.ObjectId.isValid(payment_status_id)) {
            payment.payment_status_id = payment_status_id;
        }

        const updated = await payment.save();

        const result = await Payment.findById(updated._id)
            .populate('ticket_id')
            .populate('payment_method_id')
            .populate('payment_status_id');

        res.json(createResponse(200, 'Cập nhật thanh toán thành công', result));
    } catch (err) {
        console.error(err);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật thanh toán', null));
    }
};

// Xóa thanh toán
exports.deletePayment = async (req, res) => {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(createResponse(400, 'ID không hợp lệ', null));
    }

    try {
        const result = await Payment.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thanh toán', null));
        }

        res.json(createResponse(200, 'Xóa thanh toán thành công', null));
    } catch (err) {
        console.error(err);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa thanh toán', null));
    }
};
