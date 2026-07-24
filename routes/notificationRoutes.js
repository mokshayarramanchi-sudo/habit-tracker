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
        const user = await User.findById(req.user.userId);
        
        // Prevent duplicate subscriptions from the same device
        const exists = user.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
        if (!exists) {
            user.pushSubscriptions.push(subscription);
            await user.save();
        }

        res.status(201).json({});
    } catch (error) {
        res.status(500).json({ message: "Failed to subscribe" });
    }
});

router.get("/", async (req, res) => {
    try {
        const userId = req.user.userId;
        const { getISTComponents, sendPushToUser } = require("../utils/notificationCron");
        const { todayStr, currentTime, hours, now } = getISTComponents();
        
        // 1. Check for 10 PM missed progress
        if (hours >= 22) {
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
                    const notif = await Notification.create({
                        userId,
                        title: "Reminder",
                        message: "you are not entered today records enter it",
                        type: "reminder",
                        identifier
                    });
                    await sendPushToUser(userId, { title: notif.title, body: notif.message, url: "/home" });
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
                    const notif = await Notification.create({
                        userId,
                        title: "Reminder",
                        message: "you are not entered today diary enter it",
                        type: "reminder",
                        identifier
                    });
                    await sendPushToUser(userId, { title: notif.title, body: notif.message, url: "/diary" });
                }
            }
        }

        // 2. Check for Planned Habits starting today or earlier (show after 9 AM)
        if (hours >= 9) {
            const plannedHabits = await FuturePlan.find({ userId, type: 'habit' });
            for (const habit of plannedHabits) {
                if (habit.date && habit.date <= todayStr) {
                    const identifier = `habit-start-${habit._id}`;
                    const exists = await Notification.findOne({ userId, identifier });
                    if (!exists) {
                        const notif = await Notification.create({
                            userId,
                            title: "Habit Started",
                            message: `You should start this habit: ${habit.title} today!`,
                            type: "habit",
                            relatedId: habit._id,
                            identifier
                        });
                        await sendPushToUser(userId, { title: notif.title, body: notif.message, url: "/future-plans" });
                    }
                }
            }
        }

        // 3. Check for Future Tasks
        const plannedTasks = await FuturePlan.find({ userId, type: 'task' });
        
        for (const task of plannedTasks) {
            if (task.date && task.time) {
                const taskTimeMs = new Date(`${task.date}T${task.time}:00+05:30`).getTime();
                if (isNaN(taskTimeMs)) continue;
                
                const currentMs = now.getTime();
                const diffMins = Math.floor((taskTimeMs - currentMs) / 60000);
                
                // 1 hour before window (between 0 and 60 minutes remaining)
                if (diffMins <= 60 && diffMins > 0) {
                    const identifier = `task-due-${task._id}`;
                    const exists = await Notification.findOne({ userId, identifier });
                    if (!exists) {
                        const notif = await Notification.create({
                            userId, title: "Task Due Soon",
                            message: `Your planned task is due soon: ${task.title} at ${task.time}!`,
                            type: "task", relatedId: task._id, identifier
                        });
                        await sendPushToUser(userId, { title: notif.title, body: notif.message, url: "/future-plans" });
                    }
                }
                
                // Exact time or already past
                if (diffMins <= 0) {
                    const identifier = `task-now-${task._id}`;
                    const exists = await Notification.findOne({ userId, identifier });
                    if (!exists) {
                        const notif = await Notification.create({
                            userId, title: "Task Time",
                            message: `You should start doing your task right now: ${task.title}!`,
                            type: "task", relatedId: task._id, identifier
                        });
                        await sendPushToUser(userId, { title: notif.title, body: notif.message, url: "/future-plans" });
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
