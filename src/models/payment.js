const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    payment_id: {
        type: String,
        required: true,
        unique: true
    },
    ticket_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
        required: true
    },
    payment_method: {
        type: Number,      // 0 = tiền mặt, 1 = chuyển khoản
        required: true
    },

    status_order: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },

    // Các trường từ VNPay callback
    vnp_TransactionNo: {// Mã giao dịch tại hệ thống VNPay.
        type: String,
        default: null
    },
    vnp_ResponseCode: {//Mã phản hồi kết quả thanh toán từ VNPay.
        type: String,
        default: null
    },
    vnp_BankCode: { // Mã ngân hàng khách hàng đã sử dụng để thanh toán.
        type: String,
        default: null
    },
    vnp_PayDate: {
        type: Date, // hoặc chuyển thành Date nếu bạn muốn parse về dạng chuẩn
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
