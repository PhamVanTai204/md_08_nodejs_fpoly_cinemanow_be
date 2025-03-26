const mongoose = require('mongoose');

const showTimeSchema = new mongoose.Schema({
    showtime_id: {
        type: String,
        required: true,
        unique: true
    },
    movie_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Film',
        required: true
    },
    date: {
        type: String,
        required: true
    },
    start_time: {
        type: String,
        required: true
    },
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    status: {
        type: Number,
        required: true,
        default: 1 // 1: Sắp chiếu, 2: Đang chiếu, 3: Đã chiếu xong
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ShowTime', showTimeSchema);
