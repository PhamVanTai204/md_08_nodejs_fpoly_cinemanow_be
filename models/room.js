const mongoose = require("mongoose");



const RoomSchema = new mongoose.Schema({

    cinema_id: { type: mongoose.Schema.Types.ObjectId, ref: "Cinema", required: true },

    room_name: { type: String, required: true },

    room_status: { type: Number, required: true }

});



module.exports = mongoose.model("Room", RoomSchema);