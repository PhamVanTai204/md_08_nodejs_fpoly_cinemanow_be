const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    voucher_id: {
        type: String,
        required: true,
        unique: true
    },
    //Thiếu user_id trong voucher nếu không có thì ko xác định được ai là người chọn voucher , ai là người tạo voucher
    // user_id: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User',
    //     required: true
    // },
    voucher_value: {
        type: Number,
        required: true
    },
    start_date_voucher: {
        type: Date,
        required: true
    },
    end_date_voucher: {
        type: Date,
        required: true
    },
    total_voucher: {
        type: Number,
        required: true,
        min: 0
    },
    code_voucher: {
        type: String,
        required: true,
        unique: true
    },
    status_voucher: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'active',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Voucher', voucherSchema); 