const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const authMiddleware = require("../middleware/authMiddleware");

// Protect all task routes
router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, type, frequency, timeTracking, timeValue, minDays, active } = req.body;

    if (!name || !type || !frequency) {
      return res.status(400).json({ message: "Name, type, and frequency are required." });
    }

    const task = new Task({
      userId: req.user.userId,
      name,
      type,
      frequency,
      timeTracking: Boolean(timeTracking),
      timeValue: timeTracking ? String(timeValue || "") : "",
      minDays: minDays ? String(minDays) : "",
      active: typeof active === "boolean" ? active : true
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updates = {
      ...req.body,
      timeTracking: Boolean(req.body.timeTracking),
      timeValue: req.body.timeTracking ? String(req.body.timeValue || "") : "",
      minDays: req.body.minDays ? String(req.body.minDays) : ""
    };

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
