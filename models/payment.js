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
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    payment_method_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentMethod',
        required: true
    },
    payment_status_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentStatus',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    payment_time: {
        type: Date,
        default: Date.now
    },
    status_order: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema); 