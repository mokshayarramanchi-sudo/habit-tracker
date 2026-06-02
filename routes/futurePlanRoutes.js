const express = require("express");
const router = express.Router();
const FuturePlan = require("../models/FuturePlan");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/", async (req, res) => {
    try {
        const plans = await FuturePlan.find({ userId: req.user.userId }).sort({ date: 1 });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const { title, type, category, date, time, priority, notes, description } = req.body;
        const plan = new FuturePlan({
            userId: req.user.userId,
            title, type, category, date, time, priority, notes, description
        });
        await plan.save();
        res.status(201).json(plan);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const { title, type, category, date, time, priority, notes, description } = req.body;
        const plan = await FuturePlan.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { title, type, category, date, time, priority, notes, description },
            { new: true }
        );
        if (!plan) return res.status(404).json({ message: "Plan not found" });
        res.json(plan);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const plan = await FuturePlan.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
        if (!plan) return res.status(404).json({ message: "Plan not found" });
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
