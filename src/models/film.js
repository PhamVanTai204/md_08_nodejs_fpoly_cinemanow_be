const db = require('./db')
const filmSchema = db.mongoose.Schema({

    status_film: {
        type: Number,
        required: true,
    },
    //     0 = Đã lên lịch
    // 1 = Đang chiếu
    // 2 = Đã chiếu xong
    // 3 = Đã hủy

    genre_film: [{
        type: db.mongoose.Schema.Types.ObjectId,
        ref: 'Genres', // Liên kết với bảng Genre
        required: true,
    }],

    trailer_film: {
        type: String,
        required: true,

    },
    duration: {
        type: String,
        required: true,
    },
    release_date: {
        type: String,
        required: true,
    },
    end_date: {
        type: String,
        required: true,
    },
    image_film: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    describe: {
        type: String,
        required: true
    },
    cast: {
        type: String,
        required: true
    },
    ratings: {
        type: Number,
        required: true,
    },
    box_office: {
        type: Number,
        required: false
    },
    director: {
        type: String,
        required: false
    },
    age_limit: {
        type: Number,
        required: false
    },
    language: {
        type: String,
        required: false
    }

});

const Film = db.mongoose.model('Film', filmSchema);

module.exports = Film;
