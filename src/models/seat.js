const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
    seat_id: {
        type: String,
        required: true
    },
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    seat_status: {
        type: String,
        enum: ['available', 'booked', 'unavailable', 'selecting'],
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
    },
    selected_by: {
        type: String, // Lưu ID của người dùng đang chọn ghế
        default: null
    },
    selection_time: {
        type: Date, // Thời gian bắt đầu chọn ghế
        default: null
    }
}, {
    timestamps: true
});
seatSchema.index({ seat_id: 1, room_id: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema); 