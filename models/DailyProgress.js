const mongoose = require("mongoose");

const DailyProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    dateString: {
        type: String, // format: YYYY-MM-DD
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'skipped', 'missed'],
        default: 'pending'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user only has one progress record per task per day
DailyProgressSchema.index({ userId: 1, taskId: 1, dateString: 1 }, { unique: true });

module.exports = mongoose.model("DailyProgress", DailyProgressSchema);
