const db = require('./db')
const filmSchema = db.mongoose.Schema({

    status_film: {
        type: String,
        required: true,
    },
    genre_film: {
        type: String,
        required: true,

    },
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
    image: {
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
    }

});

const Film = db.mongoose.model('Film', filmSchema);

module.exports = Film;
