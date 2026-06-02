const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Task = require("../models/Task");
const authMiddleware = require("../middleware/authMiddleware");

// Protect all user routes
router.use(authMiddleware);

// Get current user profile
router.get("/me", async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password -resetOTP -otpExpire");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Also fetch total/completed tasks if needed for stats
        const tasks = await Task.find({ userId: req.user.userId });
        const DailyProgress = require("../models/DailyProgress");
        const allHistory = await DailyProgress.find({ userId: req.user.userId });
        
        let completedTasks = 0;
        allHistory.forEach(p => {
            if (p.status === 'completed' || p.status === 'avoided') {
                completedTasks++;
            }
        });

        const dailyTaskIds = new Set();
        tasks.forEach(t => {
            if (t.frequency !== 'Weekly' && t.frequency !== 'Monthly') {
                dailyTaskIds.add(t._id.toString());
            }
        });

        const historyByDate = {};
        allHistory.forEach(record => {
            if (dailyTaskIds.has(record.taskId.toString())) {
                if (!historyByDate[record.dateString]) historyByDate[record.dateString] = { completed: 0 };
                if (record.status === 'completed' || record.status === 'avoided') {
                    historyByDate[record.dateString].completed++;
                }
            }
        });

        const successfulDates = new Set();
        Object.keys(historyByDate).forEach(dateStr => {
            const dateEnd = new Date(dateStr + 'T23:59:59Z');
            let tasksExisted = 0;
            tasks.forEach(t => {
                if (dailyTaskIds.has(t._id.toString()) && new Date(t.createdAt) <= dateEnd) {
                    tasksExisted++;
                }
            });
            if (tasksExisted === 0) {
                successfulDates.add(dateStr);
            } else {
                const completed = historyByDate[dateStr].completed;
                if ((completed / tasksExisted) * 100 >= 80) {
                    successfulDates.add(dateStr);
                }
            }
        });

        let currentStreak = 0;
        const todayString = new Date().toISOString().split('T')[0];
        let checkDate = new Date(todayString + 'T00:00:00Z');
        const getStr = (d) => d.toISOString().split('T')[0];
        let cStr = getStr(checkDate);
        if (successfulDates.has(cStr)) {
            currentStreak++;
        }
        checkDate.setDate(checkDate.getDate() - 1);
        cStr = getStr(checkDate);
        while (successfulDates.has(cStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
            cStr = getStr(checkDate);
        }
        if (!successfulDates.has(todayString) && !successfulDates.has(getStr(new Date(new Date(todayString + 'T00:00:00Z').setDate(new Date(todayString + 'T00:00:00Z').getDate() - 1))))) {
            currentStreak = 0; 
        }

        res.json({
            user,
            stats: {
                totalTasks: tasks.length,
                completedTasks: completedTasks,
                streak: currentStreak
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user profile
router.put("/profile", async (req, res) => {
    try {
        const { fullName, email, bio, avatarBase64, location, occupation } = req.body;
        
        // Ensure email is not taken by someone else
        if (email) {
            const existingUser = await User.findOne({ email, _id: { $ne: req.user.userId } });
            if (existingUser) {
                return res.status(400).json({ message: "Email already in use" });
            }
        }

        const updateData = { fullName, email, bio, location, occupation };
        if (avatarBase64 !== undefined) updateData.avatarBase64 = avatarBase64;

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updateData,
            { new: true, runValidators: true }
        ).select("-password -resetOTP -otpExpire");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({ message: "Profile updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user password
router.put("/password", async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Please provide old and new password" });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const bcrypt = require("bcryptjs");
        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect current password" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reset all tasks
router.delete("/reset-tasks", async (req, res) => {
    try {
        const Task = require("../models/Task");
        const DailyProgress = require("../models/DailyProgress");
        const FuturePlan = require("../models/FuturePlan");
        const Notification = require("../models/Notification");
        
        await Task.deleteMany({ userId: req.user.userId });
        await DailyProgress.deleteMany({ userId: req.user.userId });
        await FuturePlan.deleteMany({ userId: req.user.userId });
        await Notification.deleteMany({ userId: req.user.userId });

        res.json({ message: "All tasks and related progress have been reset." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user account
router.delete("/me", async (req, res) => {
    try {
        const Task = require("../models/Task");
        const DailyProgress = require("../models/DailyProgress");
        const FuturePlan = require("../models/FuturePlan");
        const Diary = require("../models/Diary");
        const Notification = require("../models/Notification");
        
        // Delete all user data
        await Task.deleteMany({ userId: req.user.userId });
        await DailyProgress.deleteMany({ userId: req.user.userId });
        await FuturePlan.deleteMany({ userId: req.user.userId });
        await Diary.deleteMany({ userId: req.user.userId });
        await Notification.deleteMany({ userId: req.user.userId });
        
        // Delete user
        await User.findByIdAndDelete(req.user.userId);

        res.json({ message: "User account deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
