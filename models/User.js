const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    bio: {
        type: String,
        default: ""
    },

    location: {
        type: String,
        default: ""
    },

    occupation: {
        type: String,
        default: ""
    },

    avatarBase64: {
        type: String,
        default: ""
    },

    password: {
        type: String,
        required: true
    },

    resetOTP: {
    type: String
    },

    otpExpire: {
        type: Date
    },

    sessions: [{
        token: String,
        device: String,
        lastActive: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model("User", UserSchema);