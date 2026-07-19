const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const DailyProgress = require("../models/DailyProgress");
const FuturePlan = require("../models/FuturePlan");
const authMiddleware = require("../middleware/authMiddleware");

const User = require("../models/User");

// Protect routes
router.use(authMiddleware);

// Get VAPID public key for web push
router.get("/vapid-public-key", (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post("/subscribe", async (req, res) => {
    try {
        const subscription = req.body;
        
        await User.findByIdAndUpdate(req.user.userId, {
            $addToSet: { pushSubscriptions: subscription }
        });

        res.status(201).json({});
    } catch (error) {
        res.status(500).json({ message: "Failed to subscribe" });
    }
});

router.get("/", async (req, res) => {
    try {
        const userId = req.user.userId;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"
        
        // 1. Check for 10 PM missed progress
        if (now.getHours() >= 22) {
            const Task = require("../models/Task");
            const tasks = await Task.find({ userId, active: { $ne: false } });
            let dailyTaskCount = 0;
            tasks.forEach(t => {
                if (t.frequency !== 'Weekly' && t.frequency !== 'Monthly') dailyTaskCount++;
            });

            const todayProgressList = await DailyProgress.find({ userId, dateString: todayStr });
            // If they haven't entered progress for ALL daily tasks
            if (todayProgressList.length < dailyTaskCount) {
                const identifier = `10pm-${todayStr}`;
                const exists = await Notification.findOne({ userId, identifier });
                if (!exists) {
                    await Notification.create({
                        userId,
                        title: "Reminder",
                        message: "you are not entered today records enter it",
                        type: "reminder",
                        identifier
                    });
                }
            }

            // Check for 10 PM missed diary
            const Diary = require("../models/Diary");
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            const todayDiary = await Diary.findOne({ userId, date: { $gte: startOfDay, $lte: endOfDay } });
            
            if (!todayDiary) {
                const identifier = `10pm-diary-${todayStr}`;
                const exists = await Notification.findOne({ userId, identifier });
                if (!exists) {
                    await Notification.create({
                        userId,
                        title: "Reminder",
                        message: "you are not entered today diary enter it",
                        type: "reminder",
                        identifier
                    });
                }
            }
        }

        // 2. Check for Planned Habits starting today or earlier
        const plannedHabits = await FuturePlan.find({ userId, type: 'habit' });
        for (const habit of plannedHabits) {
            if (habit.date && habit.date <= todayStr) {
                const identifier = `habit-start-${habit._id}`;
                const exists = await Notification.findOne({ userId, identifier });
                if (!exists) {
                    await Notification.create({
                        userId,
                        title: "Habit Started",
                        message: `You should start this habit: ${habit.title} today!`,
                        type: "habit",
                        relatedId: habit._id,
                        identifier
                    });
                }
            }
        }

        // 3. Check for Future Tasks whose date and time is within 1 hour
        const plannedTasks = await FuturePlan.find({ userId, type: 'task' });
        
        const isTimeForNotification = (taskTimeStr, currentTimeStr) => {
            const [tH, tM] = taskTimeStr.split(':').map(Number);
            const [cH, cM] = currentTimeStr.split(':').map(Number);
            const taskMins = tH * 60 + tM;
            const currentMins = cH * 60 + cM;
            return currentMins >= (taskMins - 60);
        };

        for (const task of plannedTasks) {
            if (task.date && task.time) {
                if (task.date < todayStr || (task.date === todayStr && isTimeForNotification(task.time, currentTime))) {
                    const identifier = `task-due-${task._id}`;
                    const exists = await Notification.findOne({ userId, identifier });
                    if (!exists) {
                        await Notification.create({
                            userId,
                            title: "Task Due Soon",
                            message: `Your planned task is due soon: ${task.title} at ${task.time}!`,
                            type: "task",
                            relatedId: task._id,
                            identifier
                        });
                    }
                }
            }
        }

        // Clean up old notifications (delete any before start of today)
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        await Notification.deleteMany({
            userId,
            createdAt: { $lt: startOfToday }
        });

        // Fetch notifications for user, only from today
        let notifications = await Notification.find({ 
            userId,
            createdAt: { $gte: startOfToday }
        }).sort({ createdAt: -1 }).lean();
        
        // Filter out notifications for deleted tasks/habits
        const existingPlans = await FuturePlan.find({ userId }).select('_id').lean();
        const existingPlanIds = new Set(existingPlans.map(p => p._id.toString()));

        notifications = notifications.filter(n => {
            if (n.relatedId) {
                return existingPlanIds.has(n.relatedId.toString());
            }
            return true;
        });
        
        const unreadCount = notifications.filter(n => !n.isRead).length;

        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark all as read
router.put("/mark-read", async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user.userId, isRead: false }, { isRead: true });
        res.json({ message: "Notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Clear all notifications
router.delete("/all", async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user.userId });
        res.json({ message: "All notifications deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
