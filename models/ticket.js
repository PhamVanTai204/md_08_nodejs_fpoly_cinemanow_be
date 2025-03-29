const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    ticket_id: {
        type: String,
        required: true,
        unique: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    showtime_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShowTime',
        required: true
    },
    seats: [{
        seat_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Seat',
            required: true
        }
    }],
    combos: [{
        combo_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Combo'
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    voucher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voucher',
        default: null
    },
    total_amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['unpaid', 'pending', 'confirmed', 'cancelled'],
        default: 'unpaid'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Ticket', ticketSchema); 