const cron = require("node-cron");
const webPush = require("web-push");
const Notification = require("../models/Notification");
const DailyProgress = require("../models/DailyProgress");
const FuturePlan = require("../models/FuturePlan");
const User = require("../models/User");
const Task = require("../models/Task");
const Diary = require("../models/Diary");

// Configure Web Push
webPush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const sendPushToUser = async (userId, payload) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) return;

        const promises = user.pushSubscriptions.map(sub =>
            webPush.sendNotification(sub, JSON.stringify(payload)).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription has expired or is no longer valid
                    return User.findByIdAndUpdate(userId, {
                        $pull: { pushSubscriptions: sub }
                    });
                }
                console.error("Push Error:", err);
            })
        );

        await Promise.all(promises);
    } catch (err) {
        console.error("Error sending push:", err);
    }
};

const getISTComponents = () => {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(d);
    let year, month, day, hour, minute;
    for (const part of parts) {
        if (part.type === 'year') year = part.value;
        if (part.type === 'month') month = part.value;
        if (part.type === 'day') day = part.value;
        if (part.type === 'hour') hour = part.value;
        if (part.type === 'minute') minute = part.value;
    }
    if (hour === '24') hour = '00';

    return {
        todayStr: `${year}-${month}-${day}`,
        currentTime: `${hour}:${minute}`,
        hours: parseInt(hour, 10),
        minutes: parseInt(minute, 10),
        now: d
    };
};

const runNotificationChecks = async () => {
    try {
        const { todayStr, currentTime, hours, minutes, now } = getISTComponents();

        const users = await User.find({});

        for (const user of users) {
            const userId = user._id;

            // 1. Check for 10 PM missed progress
            if (hours === 22 && minutes === 0) { // Run exactly at 10:00 PM once
                const tasks = await Task.find({ userId, active: { $ne: false } });
                let dailyTaskCount = 0;
                tasks.forEach(t => {
                    if (t.frequency !== 'Weekly' && t.frequency !== 'Monthly') dailyTaskCount++;
                });

                const todayProgressList = await DailyProgress.find({ userId, dateString: todayStr });
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

            // 2. Check for Planned Habits starting today or earlier (run at 9:00 AM)
            if (hours === 9 && minutes === 0) {
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

            // 3. Check for Future Tasks whose date and time is within 1 hour
            const plannedTasks = await FuturePlan.find({ userId, type: 'task' });

            const isTimeForNotification = (taskTimeStr, currentTimeStr) => {
                const [tH, tM] = taskTimeStr.split(':').map(Number);
                const [cH, cM] = currentTimeStr.split(':').map(Number);
                const taskMins = tH * 60 + tM;
                let currentMins = cH * 60 + cM;

                // Handle day wrap-around (if task is at 00:30 and current time is 23:30)
                if (taskMins < 60 && currentMins > 1300) {
                    currentMins -= 1440;
                }

                return currentMins === (taskMins - 60); // Trigger exactly 60 mins before
            };

            for (const task of plannedTasks) {
                if (task.date && task.time && task.date === todayStr) {
                    if (isTimeForNotification(task.time, currentTime)) {
                        const identifier = `task-due-${task._id}`;
                        const exists = await Notification.findOne({ userId, identifier });
                        if (!exists) {
                            const notif = await Notification.create({
                                userId,
                                title: "Task Due Soon",
                                message: `Your planned task is due soon: ${task.title} at ${task.time}!`,
                                type: "task",
                                relatedId: task._id,
                                identifier
                            });
                            await sendPushToUser(userId, { title: notif.title, body: notif.message, url: "/future-plans" });
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("Cron Job Error:", err);
    }
};

// Run every minute
cron.schedule('* * * * *', runNotificationChecks);

module.exports = { runNotificationChecks };
