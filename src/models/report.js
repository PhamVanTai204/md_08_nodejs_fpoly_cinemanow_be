const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    report_id: {
        type: String,
        required: true,
        unique: true
    },
    reporter_id: {
        type: String,
        required: true
    },
    reported_user_id: {
        type: String,
        required: true
    },
    review_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'rejected'],
        default: 'pending'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);