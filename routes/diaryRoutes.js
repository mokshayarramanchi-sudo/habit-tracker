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

router.put("/:id", async (req, res) => {
    try {
        const { title, content, moodIcon } = req.body;
        const entry = await Diary.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { title, content, moodIcon },
            { new: true }
        );
        if (!entry) {
            return res.status(404).json({ message: "Diary entry not found" });
        }
        res.json(entry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const entry = await Diary.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
        if (!entry) {
            return res.status(404).json({ message: "Diary entry not found" });
        }
        res.json({ message: "Diary entry deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
