const PaymentMethod = require('../models/paymentMethod');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy tất cả phương thức thanh toán
exports.getAllPaymentMethods = async (req, res) => {
    try {
        const paymentMethods = await PaymentMethod.find();
        res.json(createResponse(200, null, paymentMethods));
    } catch (error) {
        console.error('Get all payment methods error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách phương thức thanh toán', null));
    }
};

// Lấy phương thức thanh toán theo ID
exports.getPaymentMethodById = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID phương thức thanh toán không hợp lệ', null));
        }

        const paymentMethod = await PaymentMethod.findById(id);

        if (!paymentMethod) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phương thức thanh toán', null));
        }

        res.json(createResponse(200, null, paymentMethod));
    } catch (error) {
        console.error('Get payment method by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin phương thức thanh toán', null));
    }
};

// Tạo phương thức thanh toán mới
exports.createPaymentMethod = async (req, res) => {
    try {
        const { payment_method_id, method_name } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!payment_method_id || !method_name) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra payment_method_id đã tồn tại
        const existingPaymentMethod = await PaymentMethod.findOne({ payment_method_id });
        if (existingPaymentMethod) {
            return res.status(400).json(createResponse(400, 'Mã phương thức thanh toán đã tồn tại', null));
        }

        const newPaymentMethod = new PaymentMethod({
            payment_method_id,
            method_name
        });

        const savedPaymentMethod = await newPaymentMethod.save();
        res.status(201).json(createResponse(201, 'Tạo phương thức thanh toán thành công', savedPaymentMethod));
    } catch (error) {
        console.error('Create payment method error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo phương thức thanh toán', null));
    }
};

// Cập nhật phương thức thanh toán
exports.updatePaymentMethod = async (req, res) => {
    try {
        const { method_name } = req.body;
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID phương thức thanh toán không hợp lệ', null));
        }

        const paymentMethod = await PaymentMethod.findById(id);
        if (!paymentMethod) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phương thức thanh toán', null));
        }

        if (method_name) {
            paymentMethod.method_name = method_name;
        }

        const updatedPaymentMethod = await paymentMethod.save();
        res.json(createResponse(200, 'Cập nhật phương thức thanh toán thành công', updatedPaymentMethod));
    } catch (error) {
        console.error('Update payment method error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật phương thức thanh toán', null));
    }
};

// Xóa phương thức thanh toán
exports.deletePaymentMethod = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID phương thức thanh toán không hợp lệ', null));
        }

        const paymentMethod = await PaymentMethod.findById(id);
        if (!paymentMethod) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy phương thức thanh toán', null));
        }

        await PaymentMethod.deleteOne({ _id: id });
        res.json(createResponse(200, 'Xóa phương thức thanh toán thành công', null));
    } catch (error) {
        console.error('Delete payment method error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa phương thức thanh toán', null));
    }
}; 