const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
    payment_method_id: {
        type: String,
        required: true,
        unique: true
    },
    method_name: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema); 