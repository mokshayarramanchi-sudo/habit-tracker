const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String, // 'reminder', 'habit', 'task'
        required: true
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        // Reference to FuturePlan or null
    },
    identifier: {
        type: String, // Used to prevent duplicates (e.g., '10pm-2023-10-01')
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Notification", NotificationSchema);
