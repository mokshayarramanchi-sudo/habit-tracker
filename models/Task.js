const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // FIX: Enforced strict data isolation
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        trim: true
    },
    frequency: {
        type: String,
        required: true,
        trim: true
    },
    timeTracking: {
        type: Boolean,
        default: false
    },
    timeValue: {
        type: String,
        trim: true,
        default: ''
    },
    minDays: {
        type: String,
        trim: true,
        default: ''
    },
    active: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Task", TaskSchema);
