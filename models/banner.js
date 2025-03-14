const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bannerSchema = new Schema({
    banner_id: {
        type: String,
        required: true,
        unique: true
    },
    movie_id: {
        type: Schema.Types.ObjectId,
        ref: 'Film',
        required: true
    },
    image_url: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
