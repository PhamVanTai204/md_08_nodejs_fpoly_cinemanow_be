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
        type: String,
        default: null
    },
    selection_time: {
        type: Date,
        default: null
    },
    // THÊM MỚI: Theo dõi trạng thái theo từng suất chiếu
    showtime_status: [{
        showtime_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ShowTime',
            required: true
        },
        status: {
            type: String,
            enum: ['available', 'booked', 'selecting'],
            default: 'available'
        },
        selected_by: {
            type: String,
            default: null
        },
        selection_time: {
            type: Date,
            default: null
        }
    }]
}, {
    timestamps: true
});

// Index cho hiệu suất
seatSchema.index({ seat_id: 1, room_id: 1 }, { unique: true });
seatSchema.index({ room_id: 1, 'showtime_status.showtime_id': 1 });

module.exports = mongoose.model('Seat', seatSchema);