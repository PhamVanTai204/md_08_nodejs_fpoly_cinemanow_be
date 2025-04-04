const mongoose = require('mongoose');

const vnpayTransactionSchema = new mongoose.Schema({
    orderInfo: {
        type: String,
        required: true
    },
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    bankCode: {
        type: String
    },
    bankTranNo: {
        type: String
    },
    cardType: {
        type: String
    },
    payDate: {
        type: Date
    },
    responseCode: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('VNPayTransaction', vnpayTransactionSchema); 