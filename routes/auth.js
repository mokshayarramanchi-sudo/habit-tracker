const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

const User = require("../models/User");
const Task = require("../models/Task"); // Imported Task for data migration

router.post("/signup", async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            fullName,
            email,
            password: hashedPassword
        });

        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const joinedDate = user._id.getTimestamp ? user._id.getTimestamp() : new Date();

        const device = req.headers['user-agent'] || 'Unknown Device';
        user.sessions.push({ token, device });
        await user.save();

        res.json({
            message: "Signup Successful",
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, joined: joinedDate, avatarBase64: user.avatarBase64 }
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        const device = req.headers['user-agent'] || 'Unknown Device';
        user.sessions.push({ token, device });
        await user.save();

        // Lazy migration: link existing orphaned tasks to this user upon first login
        await Task.updateMany(
            { $or: [{ userId: { $exists: false } }, { userId: null }] },
            { $set: { userId: user._id } }
        );

        const joinedDate = user._id.getTimestamp ? user._id.getTimestamp() : new Date();
        res.json({ token, user: { id: user._id, fullName: user.fullName, email: user.email, joined: joinedDate, avatarBase64: user.avatarBase64 } });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;