const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
    seat_id: {
        type: String,
        required: true,
        unique: true
    },
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    type: {
        type: String,
        enum: ['standard', 'vip', 'couple'],
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    is_available: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Seat', seatSchema); 