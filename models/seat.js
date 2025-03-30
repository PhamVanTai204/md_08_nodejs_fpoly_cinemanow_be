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
    seat_status: {
        type: String,
        enum: ['available', 'booked', 'unavailable'],
        default: 'available',
        required: true
    },
    seat_type: {
        type: String,
        enum: ['standard', 'vip', 'couple'],
        default: 'standard',
        required: true
    },
    price_seat: {
        type: Number,
        required: true
    },
    column_of_seat: {
        type: String,
        required: true
    },
    row_of_seat: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Seat', seatSchema); 