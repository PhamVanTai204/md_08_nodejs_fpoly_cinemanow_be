const Voucher = require('../models/voucher');
const createResponse = require('../utils/responseHelper');
const mongoose = require('mongoose');

// SECTION: Controllers quản lý voucher

// ANCHOR: Lấy danh sách voucher
exports.getAllVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find();
        res.json(createResponse(200, null, vouchers));
    } catch (error) {
        // ERROR: Ghi log lỗi khi không thể lấy danh sách voucher
        console.error('Get all vouchers error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy danh sách voucher', null));
    }
};

// ANCHOR: Lấy voucher theo ID
exports.getVoucherById = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);

        if (!voucher) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy voucher', null));
        }

        res.json(createResponse(200, null, voucher));
    } catch (error) {
        // ERROR: Ghi log lỗi khi không thể lấy thông tin voucher theo ID
        console.error('Get voucher by id error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi lấy thông tin voucher', null));
    }
};

// ANCHOR: Tạo voucher mới
exports.createVoucher = async (req, res) => {
    try {
        const { voucher_id, voucher_value, start_date_voucher, end_date_voucher, total_voucher, code_voucher, status_voucher } = req.body;

        // IMPORTANT: Kiểm tra đầy đủ thông tin trước khi tạo voucher
        if (!voucher_id || !voucher_value || !start_date_voucher || !end_date_voucher || !total_voucher || !code_voucher) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp đầy đủ thông tin', null));
        }

        // NOTE: Kiểm tra sự tồn tại của voucher để tránh trùng lặp
        const existingVoucherId = await Voucher.findOne({ voucher_id });
        if (existingVoucherId) {
            return res.status(400).json(createResponse(400, 'Mã voucher đã tồn tại', null));
        }

        const existingVoucherCode = await Voucher.findOne({ code_voucher });
        if (existingVoucherCode) {
            return res.status(400).json(createResponse(400, 'Mã code voucher đã tồn tại', null));
        }

        // IMPORTANT: Kiểm tra tính hợp lệ của ngày bắt đầu và kết thúc
        const startDate = new Date(start_date_voucher);
        const endDate = new Date(end_date_voucher);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json(createResponse(400, 'Ngày không hợp lệ', null));
        }

        if (endDate <= startDate) {
            return res.status(400).json(createResponse(400, 'Ngày kết thúc phải sau ngày bắt đầu', null));
        }

        // FIXME: Cần thêm validation cho định dạng ngày tháng cụ thể

        // NOTE: Kiểm tra các giá trị số
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
        // ERROR: Ghi log lỗi khi không thể tạo voucher
        console.error('Create voucher error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi tạo voucher', null));
    }
};

// ANCHOR: Cập nhật thông tin voucher
exports.updateVoucher = async (req, res) => {
    try {
        const { voucher_value, start_date_voucher, end_date_voucher, total_voucher, status_voucher } = req.body;
        const id = req.params.id;

        // IMPORTANT: Kiểm tra tính hợp lệ của ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json(createResponse(400, 'ID voucher không hợp lệ', null));
        }

        // NOTE: Kiểm tra sự tồn tại của voucher
        const voucher = await Voucher.findById(id);
        if (!voucher) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy voucher', null));
        }

        // IMPORTANT: Kiểm tra và cập nhật ngày nếu có
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

        // FIXME: Cần kiểm tra thêm về định dạng và tính hợp lệ của ngày

        // NOTE: Cập nhật các thông tin khác
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
            // WARNING: Đảm bảo trạng thái voucher hợp lệ
            if (!['active', 'inactive', 'expired'].includes(status_voucher)) {
                return res.status(400).json(createResponse(400, 'Trạng thái voucher không hợp lệ', null));
            }
            voucher.status_voucher = status_voucher;
        }

        const updatedVoucher = await voucher.save();
        res.json(createResponse(200, 'Cập nhật voucher thành công', updatedVoucher));
    } catch (error) {
        // ERROR: Ghi log lỗi khi không thể cập nhật voucher
        console.error('Update voucher error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi cập nhật voucher', null));
    }
};

// ANCHOR: Xóa voucher
exports.deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy voucher', null));
        }

        // WARNING: Thao tác xóa không thể hoàn tác
        await Voucher.deleteOne({ _id: req.params.id });
        res.json(createResponse(200, 'Xóa voucher thành công', null));
    } catch (error) {
        // ERROR: Ghi log lỗi khi không thể xóa voucher
        console.error('Delete voucher error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi xóa voucher', null));
    }
};

// ANCHOR: Áp dụng voucher vào đơn hàng
exports.applyVoucher = async (req, res) => {
    try {
        const { code_voucher, total_amount } = req.body;

        // IMPORTANT: Kiểm tra đầu vào
        if (!code_voucher) {
            return res.status(400).json(createResponse(400, 'Vui lòng cung cấp mã voucher', null));
        }

        if (!total_amount || total_amount <= 0) {
            return res.status(400).json(createResponse(400, 'Tổng tiền không hợp lệ', null));
        }

        // NOTE: Tìm voucher theo mã code
        const voucher = await Voucher.findOne({ code_voucher });

        // Kiểm tra voucher tồn tại
        if (!voucher) {
            return res.status(404).json(createResponse(404, 'Không tìm thấy voucher với mã này', null));
        }

        // WARNING: Kiểm tra các điều kiện của voucher
        if (voucher.status_voucher !== 'active') {
            return res.status(400).json(createResponse(400, 'Voucher đã hết hạn hoặc không khả dụng', null));
        }

        if (voucher.total_voucher <= 0) {
            return res.status(400).json(createResponse(400, 'Voucher đã hết số lượng', null));
        }

        // IMPORTANT: Kiểm tra thời hạn sử dụng
        const currentDate = new Date();
        if (currentDate < voucher.start_date_voucher || currentDate > voucher.end_date_voucher) {
            return res.status(400).json(createResponse(400, 'Voucher nằm ngoài thời hạn sử dụng', null));
        }

        // NOTE: Tính toán số tiền giảm
        let discountAmount = voucher.voucher_value;

        // OPTIMIZE: Có thể thêm logic giảm giá phức tạp hơn như % tổng giá trị
        if (discountAmount > total_amount) {
            discountAmount = total_amount;
        }

        const finalAmount = total_amount - discountAmount;

        // IMPORTANT: Giảm số lượng voucher sau khi sử dụng
        voucher.total_voucher -= 1;
        await voucher.save();

        // TODO: Thêm lịch sử sử dụng voucher để tracking

        // Trả về kết quả
        res.json(createResponse(200, 'Áp dụng voucher thành công', {
            voucher_id: voucher.voucher_id,
            code_voucher: voucher.code_voucher,
            voucher_value: voucher.voucher_value,
            discount_amount: discountAmount,
            original_amount: total_amount,
            final_amount: finalAmount
        }));
    } catch (error) {
        // ERROR: Ghi log lỗi khi không thể áp dụng voucher
        console.error('Apply voucher error:', error);
        res.status(500).json(createResponse(500, 'Lỗi khi áp dụng voucher', null));
    }
};

// IDEA: Thêm tính năng lọc voucher theo trạng thái, ngày, giá trị
// TODO: Thêm chức năng báo cáo thống kê việc sử dụng voucher
// LINK: https://mongoosejs.com/docs/queries.html - Tài liệu về truy vấn Mongoose

// END-SECTION