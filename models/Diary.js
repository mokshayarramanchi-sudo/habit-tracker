const mongoose = require("mongoose");

const DiarySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    moodIcon: {
        type: String,
        default: '📝'
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Diary", DiarySchema);
