const Payment = require('../models/payment');
const Ticket = require('../models/ticket');
const PaymentStatus = require('../models/paymentStatus');
const PaymentMethod = require('../models/paymentMethod');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy danh sách thanh toán
exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('ticket_id')
            .populate('user_id')
            .populate('payment_method_id')
            .populate('payment_status_id');
        res.json(createResponse(200, null, payments));
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách thanh toán', null));
    }
};

// Lấy thông tin thanh toán theo ID
exports.getPaymentById = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID thanh toán không hợp lệ', null));
        }

        const payment = await Payment.findById(id)
            .populate('ticket_id')
            .populate('user_id')
            .populate('payment_method_id')
            .populate('payment_status_id');

        if (!payment) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thanh toán', null));
        }

        res.json(createResponse(200, null, payment));
    } catch (error) {
        console.error('Get payment by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin thanh toán', null));
    }
};

// Tạo thanh toán mới
exports.createPayment = async (req, res) => {
    try {
        const { ticket_id, payment_method_id } = req.body;

        // Kiểm tra ticket tồn tại
        const ticket = await Ticket.findById(ticket_id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        // Kiểm tra payment_method_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(payment_method_id)) {
            return res.status(400).json(createResponse(400, 'ID phương thức thanh toán không hợp lệ', null));
        }

        // Tạo mã thanh toán
        const payment_id = 'PAY' + Date.now();

        const newPayment = new Payment({
            payment_id,
            ticket_id: ticket._id,
            user_id: ticket.user_id,
            payment_method_id,
            payment_status_id: await PaymentStatus.findOne({ name: 'pending' }),
            amount: ticket.total_amount
        });

        const savedPayment = await newPayment.save();
        const populatedPayment = await Payment.findById(savedPayment._id)
            .populate('ticket_id')
            .populate('user_id')
            .populate('payment_method_id')
            .populate('payment_status_id');

        res.status(201).json(createResponse(201, 'Tạo thanh toán thành công', populatedPayment));
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo thanh toán', null));
    }
};

// Cập nhật thanh toán
exports.updatePayment = async (req, res) => {
    try {
        const { payment_method_id, payment_status_id } = req.body;
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID thanh toán không hợp lệ', null));
        }

        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thanh toán', null));
        }

        if (payment_method_id) {
            if (!mongoose.Types.ObjectId.isValid(payment_method_id)) {
                return res.status(400).json(createResponse(400, 'ID phương thức thanh toán không hợp lệ', null));
            }
            payment.payment_method_id = payment_method_id;
        }

        if (payment_status_id) {
            if (!mongoose.Types.ObjectId.isValid(payment_status_id)) {
                return res.status(400).json(createResponse(400, 'ID trạng thái thanh toán không hợp lệ', null));
            }
            payment.payment_status_id = payment_status_id;
        }

        const updatedPayment = await payment.save();
        const populatedPayment = await Payment.findById(updatedPayment._id)
            .populate('ticket_id')
            .populate('user_id')
            .populate('payment_method_id')
            .populate('payment_status_id');

        res.json(createResponse(200, 'Cập nhật thanh toán thành công', populatedPayment));
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật thanh toán', null));
    }
};

// Xóa thanh toán
exports.deletePayment = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID thanh toán không hợp lệ', null));
        }

        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thanh toán', null));
        }

        await Payment.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa thanh toán thành công', null));
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa thanh toán', null));
    }
};

// Xác nhận thanh toán
exports.confirmPayment = async (req, res) => {
    try {
        const { ticket_id, payment_method_id } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!ticket_id || !payment_method_id) {
            return res.status(400).json(createResponse(400, 'Thiếu thông tin thanh toán', null));
        }

        // Kiểm tra vé tồn tại
        const ticket = await Ticket.findOne({ ticket_id });
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        // Kiểm tra phương thức thanh toán tồn tại
        const paymentMethod = await PaymentMethod.findById(payment_method_id);
        if (!paymentMethod) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phương thức thanh toán', null));
        }

        // Tạo mã thanh toán
        const payment_id = 'PAY' + Date.now();

        // Tạo thanh toán mới
        const newPayment = new Payment({
            payment_id,
            ticket_id: ticket._id,
            payment_method_id,
            payment_status_id: mongoose.Types.ObjectId(), // ID trạng thái thanh toán
            payment_time: new Date(),
            status_order: 'completed'
        });

        // Lưu thanh toán
        await newPayment.save();

        // Cập nhật trạng thái vé thành confirmed
        ticket.status = 'confirmed';
        await ticket.save();

        // Populate thông tin thanh toán
        const populatedPayment = await Payment.findById(newPayment._id)
            .populate('ticket_id')
            .populate('payment_method_id');

        res.json(createResponse(200, 'Xác nhận thanh toán thành công', populatedPayment));
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xác nhận thanh toán', null));
    }
};

// Xử lý thanh toán không thành công
exports.failedPayment = async (req, res) => {
    try {
        const { ticket_id, payment_method_id, reason } = req.body;

        // Kiểm tra ticket tồn tại
        const ticket = await Ticket.findOne({ ticket_id });
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        // Kiểm tra trạng thái vé
        if (ticket.status === 'confirmed') {
            return res.status(400).json(createResponse(400, 'Vé đã được thanh toán trước đó', null));
        }

        if (ticket.status === 'cancelled') {
            return res.status(400).json(createResponse(400, 'Vé đã bị hủy', null));
        }

        // Kiểm tra payment_method_id hợp lệ
        if (!mongoose.Types.ObjectId.isValid(payment_method_id)) {
            return res.status(400).json(createResponse(400, 'ID phương thức thanh toán không hợp lệ', null));
        }

        // Lấy payment_status_id cho trạng thái failed
        const failedStatus = await PaymentStatus.findOne({ name: 'failed' });
        if (!failedStatus) {
            return res.status(500).json(createResponse(500, 'Không tìm thấy trạng thái thanh toán', null));
        }

        // Cập nhật trạng thái vé thành cancelled
        ticket.status = 'cancelled';
        await ticket.save();

        // Tạo payment record
        const payment = new Payment({
            payment_id: 'PAY' + Date.now(),
            ticket_id: ticket._id,
            user_id: ticket.user_id,
            payment_method_id,
            payment_status_id: failedStatus._id,
            amount: ticket.total_amount,
            failure_reason: reason || 'Thanh toán không thành công'
        });
        await payment.save();

        // Trả về thông tin đã cập nhật
        const updatedTicket = await Ticket.findById(ticket._id)
            .populate('user_id')
            .populate('showtime_id')
            .populate('seats.seat_id')
            .populate('combos.combo_id')
            .populate('voucher_id');

        const populatedPayment = await Payment.findById(payment._id)
            .populate('payment_method_id')
            .populate('payment_status_id');

        res.json(createResponse(200, 'Đã ghi nhận thanh toán không thành công', {
            ticket: updatedTicket,
            payment: populatedPayment
        }));
    } catch (error) {
        console.error('Failed payment error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xử lý thanh toán không thành công', null));
    }
};

// Đảm bảo export tất cả các hàm
module.exports = {
    getAllPayments: exports.getAllPayments,
    getPaymentById: exports.getPaymentById,
    createPayment: exports.createPayment,
    updatePayment: exports.updatePayment,
    deletePayment: exports.deletePayment,
    confirmPayment: exports.confirmPayment,
    failedPayment: exports.failedPayment
}; 