const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    cinema_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cinema",
        required: true
    },
    room_name: {
        type: String,
        required: true
    },
    room_style: {
        type: String,
        enum: ['2D', '3D', '4DX', 'IMAX'],
        required: true
    },
    total_seat: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'maintenance', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Tạo index cho cinema_id để tối ưu truy vấn
roomSchema.index({ cinema_id: 1 });

// Đảm bảo room_name là duy nhất trong cùng một rạp
roomSchema.index({ room_name: 1, cinema_id: 1 }, { unique: true });

module.exports = mongoose.model("Room", roomSchema);