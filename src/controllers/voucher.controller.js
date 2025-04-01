const Voucher = require('../models/voucher');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Lấy tất cả voucher
exports.getAllVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find();
        res.json(createResponse(200, null, vouchers));
    } catch (error) {
        console.error('Get all vouchers error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách voucher', null));
    }
};

// Lấy voucher theo ID
exports.getVoucherById = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy voucher', null));
        }

        res.json(createResponse(200, null, voucher));
    } catch (error) {
        console.error('Get voucher by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin voucher', null));
    }
};

// Tạo voucher mới
exports.createVoucher = async (req, res) => {
    try {
        const { voucher_id, voucher_value, start_date_voucher, end_date_voucher, total_voucher, code_voucher, status_voucher } = req.body;

        // Kiểm tra đầy đủ thông tin
        if (!voucher_id || !voucher_value || !start_date_voucher || !end_date_voucher || !total_voucher || !code_voucher) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // Kiểm tra voucher_id đã tồn tại
        const existingVoucherId = await Voucher.findOne({ voucher_id });
        if (existingVoucherId) {
            return res.status(400).json(createResponse(400, 'Mã voucher đã tồn tại', null));
        }

        // Kiểm tra code_voucher đã tồn tại
        const existingVoucherCode = await Voucher.findOne({ code_voucher });
        if (existingVoucherCode) {
            return res.status(400).json(createResponse(400, 'Mã code voucher đã tồn tại', null));
        }

        // Kiểm tra ngày hợp lệ
        const startDate = new Date(start_date_voucher);
        const endDate = new Date(end_date_voucher);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json(createResponse(400, 'Ngày không hợp lệ', null));
        }

        if (endDate <= startDate) {
            return res.status(400).json(createResponse(400, 'Ngày kết thúc phải sau ngày bắt đầu', null));
        }

        // Kiểm tra giá trị voucher và số lượng
        if (voucher_value <= 0) {
            return res.status(400).json(createResponse(400, 'Giá trị voucher phải lớn hơn 0', null));
        }

        if (total_voucher < 0) {
            return res.status(400).json(createResponse(400, 'Số lượng voucher không được âm', null));
        }

        const newVoucher = new Voucher({
            voucher_id,
            voucher_value,
            start_date_voucher: startDate,
            end_date_voucher: endDate,
            total_voucher,
            code_voucher,
            status_voucher: status_voucher || 'active'
        });

        const savedVoucher = await newVoucher.save();
        res.status(201).json(createResponse(201, 'Tạo voucher thành công', savedVoucher));
    } catch (error) {
        console.error('Create voucher error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo voucher', null));
    }
};

// Cập nhật voucher
exports.updateVoucher = async (req, res) => {
    try {
        const { voucher_value, start_date_voucher, end_date_voucher, total_voucher, status_voucher } = req.body;
        const id = req.params.id;

        // Kiểm tra ID hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID voucher không hợp lệ', null));
        }

        // Kiểm tra voucher tồn tại
        const voucher = await Voucher.findById(id);
        if (!voucher) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy voucher', null));
        }

        // Kiểm tra và cập nhật ngày nếu có
        if (start_date_voucher || end_date_voucher) {
            const startDate = start_date_voucher ? new Date(start_date_voucher) : voucher.start_date_voucher;
            const endDate = end_date_voucher ? new Date(end_date_voucher) : voucher.end_date_voucher;

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json(createResponse(400, 'Ngày không hợp lệ', null));
            }

            if (endDate <= startDate) {
                return res.status(400).json(createResponse(400, 'Ngày kết thúc phải sau ngày bắt đầu', null));
            }

            voucher.start_date_voucher = startDate;
            voucher.end_date_voucher = endDate;
        }

        // Cập nhật các thông tin khác
        if (voucher_value !== undefined) {
            if (voucher_value <= 0) {
                return res.status(400).json(createResponse(400, 'Giá trị voucher phải lớn hơn 0', null));
            }
            voucher.voucher_value = voucher_value;
        }

        if (total_voucher !== undefined) {
            if (total_voucher < 0) {
                return res.status(400).json(createResponse(400, 'Số lượng voucher không được âm', null));
            }
            voucher.total_voucher = total_voucher;
        }

        if (status_voucher) {
            if (!['active', 'inactive', 'expired'].includes(status_voucher)) {
                return res.status(400).json(createResponse(400, 'Trạng thái voucher không hợp lệ', null));
            }
            voucher.status_voucher = status_voucher;
        }

        const updatedVoucher = await voucher.save();
        res.json(createResponse(200, 'Cập nhật voucher thành công', updatedVoucher));
    } catch (error) {
        console.error('Update voucher error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật voucher', null));
    }
};

// Xóa voucher
exports.deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy voucher', null));
        }

        await Voucher.deleteOne({ _id: req.params.id });
        res.json(createResponse(200, 'Xóa voucher thành công', null));
    } catch (error) {
        console.error('Delete voucher error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa voucher', null));
    }
}; 