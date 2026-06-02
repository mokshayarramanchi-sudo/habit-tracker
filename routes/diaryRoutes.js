const express = require("express");
const router = express.Router();
const Diary = require("../models/Diary");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/", async (req, res) => {
    try {
        const entries = await Diary.find({ userId: req.user.userId }).sort({ date: -1 });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const { title, content, moodIcon } = req.body;
        const entry = new Diary({
            userId: req.user.userId,
            title,
            content,
            moodIcon
        });
        await entry.save();
        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
