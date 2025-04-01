const mongoose = require("mongoose");

const CinemaSchema = new mongoose.Schema({
    cinema_name: { type: String, required: true },
    location: { type: String, required: true },
    total_room: { type: Number, default: 0 }
}, {
    timestamps: true
});

module.exports = mongoose.model("Cinema", CinemaSchema);
