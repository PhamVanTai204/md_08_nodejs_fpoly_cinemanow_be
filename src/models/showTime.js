const db = require('./db');

const showTimeSchema = db.mongoose.Schema({
    movie_id: {
        type: String,
        ref: 'Film',  // Liên kết với bảng phim
        required: true
    },
    showtime_status: {
        type: Number,
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
    price: {
        type: Number,
        required: true
    }
});

const showTimeManagement = db.mongoose.model('ShowTimeManagement', showTimeSchema);

module.exports = showTimeManagement;
