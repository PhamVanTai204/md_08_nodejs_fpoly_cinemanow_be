const Payment = require('../models/payment');
const Ticket = require('../models/ticket');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy tất cả payment
exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('ticket_id')
            .populate('payment_method_id')
            .populate('payment_status_id');
        res.json(createResponse(200, null, payments));
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách thanh toán', null));
    }
};

// Lấy payment theo ID
exports.getPaymentById = async (req, res) => {
    try {
        const id = req.params.id;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID thanh toán không hợp lệ', null));
        }

        const payment = await Payment.findById(id)
            .populate('ticket_id')
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

// Tạo payment mới
exports.createPayment = async (req, res) => {
    try {
        const {
            payment_id,
            ticket_id,
            payment_method_id,
            payment_status_id,
            payment_time,
            status_order
        } = req.body;

        // Kiểm tra đầy đủ thông tin bắt buộc
        if (!payment_id || !ticket_id || !payment_method_id || !payment_status_id) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin bắt buộc', null));
        }

        // Kiểm tra payment_id đã tồn tại
        const existingPayment = await Payment.findOne({ payment_id });
        if (existingPayment) {
            return res.status(400).json(createResponse(400, 'Mã thanh toán đã tồn tại', null));
        }

        // Kiểm tra ticket tồn tại
        if (!mongoose.Types.ObjectId.isValid(ticket_id)) {
            return res.status(400).json(createResponse(400, 'ID vé không hợp lệ', null));
        }
        const ticket = await Ticket.findById(ticket_id);
        if (!ticket) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy vé', null));
        }

        // Kiểm tra payment method tồn tại
        if (!mongoose.Types.ObjectId.isValid(payment_method_id)) {
            return res.status(400).json(createResponse(400, 'ID phương thức thanh toán không hợp lệ', null));
        }

        // Kiểm tra payment status tồn tại
        if (!mongoose.Types.ObjectId.isValid(payment_status_id)) {
            return res.status(400).json(createResponse(400, 'ID trạng thái thanh toán không hợp lệ', null));
        }

        // Kiểm tra status_order hợp lệ
        const validStatusOrders = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
        if (status_order && !validStatusOrders.includes(status_order)) {
            return res.status(400).json(createResponse(400, 'Trạng thái đơn hàng không hợp lệ', null));
        }

        const newPayment = new Payment({
            payment_id,
            ticket_id,
            payment_method_id,
            payment_status_id,
            payment_time: payment_time || Date.now(),
            status_order: status_order || 'pending'
        });

        const savedPayment = await newPayment.save();

        // Populate thông tin liên quan
        const populatedPayment = await Payment.findById(savedPayment._id)
            .populate('ticket_id')
            .populate('payment_method_id')
            .populate('payment_status_id');

        res.status(201).json(createResponse(201, 'Tạo thanh toán thành công', populatedPayment));
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo thanh toán', null));
    }
};

// Cập nhật payment
exports.updatePayment = async (req, res) => {
    try {
        const {
            payment_method_id,
            payment_status_id,
            payment_time,
            status_order
        } = req.body;
        const id = req.params.id;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID thanh toán không hợp lệ', null));
        }

        // Kiểm tra payment tồn tại
        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy thanh toán', null));
        }

        // Cập nhật các trường nếu có
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

        if (payment_time) {
            payment.payment_time = payment_time;
        }

        if (status_order) {
            const validStatusOrders = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
            if (!validStatusOrders.includes(status_order)) {
                return res.status(400).json(createResponse(400, 'Trạng thái đơn hàng không hợp lệ', null));
            }
            payment.status_order = status_order;
        }

        const updatedPayment = await payment.save();

        // Populate thông tin liên quan
        const populatedPayment = await Payment.findById(updatedPayment._id)
            .populate('ticket_id')
            .populate('payment_method_id')
            .populate('payment_status_id');

        res.json(createResponse(200, 'Cập nhật thanh toán thành công', populatedPayment));
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật thanh toán', null));
    }
};

// Xóa payment
exports.deletePayment = async (req, res) => {
    try {
        const id = req.params.id;

        // Kiểm tra ID hợp lệ
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