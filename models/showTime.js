const db = require('./db');

const showTimeSchema = db.mongoose.Schema({
    movieId: {
        type: String,
        ref: 'Film',  // Liên kết với bảng phim
        required: true
    },
    statusShowTime: {
        type: Number,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
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
