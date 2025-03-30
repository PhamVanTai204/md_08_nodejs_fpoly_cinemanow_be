const mongoose = require('mongoose');

const paymentStatusSchema = new mongoose.Schema({
    payment_method_id: {
        type: String,
        required: true,
        unique: true
    },
    status_order: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PaymentStatus', paymentStatusSchema); 