const db = require('./db');

const genresSchema = db.mongoose.Schema({
    name: {
        type: String,
        required: true
    }
});

const genres = db.mongoose.model('Genres', genresSchema);

module.exports = genres;
