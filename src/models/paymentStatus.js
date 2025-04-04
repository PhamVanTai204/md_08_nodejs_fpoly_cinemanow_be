const mongoose = require('mongoose');

const paymentStatusSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PaymentStatus', paymentStatusSchema); 