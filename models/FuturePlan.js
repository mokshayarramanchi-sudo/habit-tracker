const mongoose = require("mongoose");

const FuturePlanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['habit', 'task'],
        required: true
    },
    category: { type: String },
    date: { type: String },
    time: { type: String },
    priority: { type: String },
    notes: { type: String },
    description: { type: String },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("FuturePlan", FuturePlanSchema);
