const PaymentStatus = require('../models/paymentStatus');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy tất cả trạng thái thanh toán
exports.getAllPaymentStatuses = async (req, res) => {
    try {
        const paymentStatuses = await PaymentStatus.find();
        res.json(createResponse(200, null, paymentStatuses));
    } catch (error) {
        console.error('Get all payment statuses error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách trạng thái thanh toán', null));
    }
};

// Lấy trạng thái thanh toán theo ID
exports.getPaymentStatusById = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID trạng thái thanh toán không hợp lệ', null));
        }

        const paymentStatus = await PaymentStatus.findById(id);

        if (!paymentStatus) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy trạng thái thanh toán', null));
        }

        res.json(createResponse(200, null, paymentStatus));
    } catch (error) {
        console.error('Get payment status by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin trạng thái thanh toán', null));
    }
};

// Tạo trạng thái thanh toán mới
exports.createPaymentStatus = async (req, res) => {
    try {
        const { payment_method_id, status_order } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!payment_method_id || !status_order) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra payment_method_id đã tồn tại
        const existingPaymentStatus = await PaymentStatus.findOne({ payment_method_id });
        if (existingPaymentStatus) {
            return res.status(400).json(createResponse(400, 'Mã trạng thái thanh toán đã tồn tại', null));
        }

        const newPaymentStatus = new PaymentStatus({
            payment_method_id,
            status_order
        });

        const savedPaymentStatus = await newPaymentStatus.save();
        res.status(201).json(createResponse(201, 'Tạo trạng thái thanh toán thành công', savedPaymentStatus));
    } catch (error) {
        console.error('Create payment status error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo trạng thái thanh toán', null));
    }
};

// Cập nhật trạng thái thanh toán
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { status_order } = req.body;
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID trạng thái thanh toán không hợp lệ', null));
        }

        const paymentStatus = await PaymentStatus.findById(id);
        if (!paymentStatus) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy trạng thái thanh toán', null));
        }

        if (status_order) {
            paymentStatus.status_order = status_order;
        }

        const updatedPaymentStatus = await paymentStatus.save();
        res.json(createResponse(200, 'Cập nhật trạng thái thanh toán thành công', updatedPaymentStatus));
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật trạng thái thanh toán', null));
    }
};

// Xóa trạng thái thanh toán
exports.deletePaymentStatus = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID trạng thái thanh toán không hợp lệ', null));
        }

        const paymentStatus = await PaymentStatus.findById(id);
        if (!paymentStatus) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy trạng thái thanh toán', null));
        }

        await PaymentStatus.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa trạng thái thanh toán thành công', null));
    } catch (error) {
        console.error('Delete payment status error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa trạng thái thanh toán', null));
    }
}; 