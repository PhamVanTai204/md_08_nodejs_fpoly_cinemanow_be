const mongoose = require('mongoose');

const showTimeSchema = new mongoose.Schema({
    showtime_id: {
        type: String,
        required: true
    },
    movie_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Film',
        required: true
    },
    room_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    start_time: {
        type: String,
        required: true
    },
    end_time: {
        type: String,
        required: true
    },
    show_date: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ShowTime', showTimeSchema);
