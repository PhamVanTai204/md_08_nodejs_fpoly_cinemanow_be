const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
    combo_id: {
        type: String,
        required: true,
        unique: true
    },
    name_combo: {
        type: String,
        required: true
    },
    price_combo: {
        type: Number,
        required: true,
        min: 0
    },
    description_combo: {
        type: String,
        required: true
    },
    image_combo: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Combo', comboSchema); 