const express = require("express");
const router = express.Router();
const Analytics = require("../models/Analytics");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

const DailyProgress = require("../models/DailyProgress");
const Task = require("../models/Task");

router.get("/progress", async (req, res) => {
    try {
        const userId = req.user.userId;
        const [history, tasks] = await Promise.all([
            DailyProgress.find({ userId }).sort({ dateString: 1 }),
            Task.find({ userId, active: { $ne: false } })
        ]);
        
        // Filter out weekly and monthly tasks
        const dailyTaskIds = new Set();
        tasks.forEach(t => {
            if (t.frequency !== 'Weekly' && t.frequency !== 'Monthly') {
                dailyTaskIds.add(t._id.toString());
            }
        });

        // Group history by date string
        const historyByDate = {};
        history.forEach(r => {
            if (dailyTaskIds.has(r.taskId.toString())) {
                if (!historyByDate[r.dateString]) historyByDate[r.dateString] = { completed: 0, avoided: 0 };
                if (r.status === 'completed' || r.status === 'avoided') {
                    historyByDate[r.dateString].completed++;
                }
            }
        });

        const calendarData = {};
        const successfulDates = new Set();
        let totalProductivityForAvg = 0;
        let daysCountForAvg = 0;
        
        let highestDay = { date: '-', percent: -1 };
        let lowestDay = { date: '-', percent: 101 };

        // We only evaluate dates that exist in historyByDate
        // If a day has no daily progress logged, it doesn't appear on the charts/streaks,
        // unless it's a gap day in streaks. 
        Object.keys(historyByDate).forEach(dateStr => {
            const dateEnd = new Date(dateStr + 'T23:59:59Z');
            let tasksExisted = 0;
            tasks.forEach(t => {
                if (dailyTaskIds.has(t._id.toString()) && new Date(t.createdAt) <= dateEnd) {
                    tasksExisted++;
                }
            });

            const completed = historyByDate[dateStr].completed;
            const percent = tasksExisted > 0 ? Math.round((completed / tasksExisted) * 100) : 100; // 0 tasks = 100% graceful handling
            const isStreak = percent >= 80;

            if (isStreak) successfulDates.add(dateStr);

            calendarData[dateStr] = {
                completed,
                total: tasksExisted,
                percent,
                isStreak
            };

            // For Highest/Lowest
            if (tasksExisted > 0) {
                if (percent > highestDay.percent) highestDay = { date: dateStr, percent };
                if (percent < lowestDay.percent) lowestDay = { date: dateStr, percent };
            }
        });

        // Current & Best Streak Logic
        let currentStreak = 0;
        let bestStreak = 0;
        
        const todayString = new Date().toISOString().split('T')[0];
        let checkDate = new Date(todayString + 'T00:00:00Z');
        const getStr = (d) => d.toISOString().split('T')[0];

        const sortedSuccess = Array.from(successfulDates).sort();
        if (sortedSuccess.length > 0) {
            let tempStreak = 1;
            bestStreak = 1;
            for (let i = 1; i < sortedSuccess.length; i++) {
                const prev = new Date(sortedSuccess[i-1] + 'T00:00:00Z');
                const curr = new Date(sortedSuccess[i] + 'T00:00:00Z');
                const diffDays = Math.ceil(Math.abs(curr - prev) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    tempStreak++;
                    if (tempStreak > bestStreak) bestStreak = tempStreak;
                } else {
                    tempStreak = 1;
                }
            }
        }

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

        // Avg Productivity (last 7 days)
        const last7Dates = [];
        const iterDate = new Date(todayString + 'T00:00:00Z');
        for (let i = 0; i < 7; i++) {
            last7Dates.push(getStr(iterDate));
            iterDate.setDate(iterDate.getDate() - 1);
        }
        
        let recentTotalPercent = 0;
        let recentDaysCount = 0;
        last7Dates.forEach(d => {
            if (calendarData[d]) {
                recentTotalPercent += calendarData[d].percent;
                recentDaysCount++;
            }
        });
        
        const avgProductivity = recentDaysCount > 0 ? Math.round(recentTotalPercent / recentDaysCount) : 0;

        res.json({
            calendarData,
            metrics: {
                currentStreak,
                bestStreak,
                avgProductivity,
                highestDay: highestDay.percent === -1 ? null : highestDay,
                lowestDay: lowestDay.percent === 101 ? null : lowestDay,
                last7Dates: last7Dates.reverse()
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/task-progress", async (req, res) => {
    try {
        const userId = req.user.userId;
        const { filter, taskId } = req.query;

        let taskQuery = { userId };
        if (filter === 'do') {
            taskQuery.type = /^DO/;
        } else if (filter === 'not-to-do') {
            taskQuery.type = /^NOT TO DO/;
        } else if (filter === 'active') {
            taskQuery.active = { $ne: false };
        }

        if (taskId && taskId !== 'all') {
            taskQuery._id = taskId;
        }

        const tasks = await Task.find(taskQuery);
        const taskIds = tasks.map(t => t._id);
        
        const history = await DailyProgress.find({ userId, taskId: { $in: taskIds } }).sort({ dateString: 1 });
        
        const result = tasks.map(task => {
            const taskHistory = history.filter(h => h.taskId.toString() === task._id.toString());
            
            const successfulDates = new Set();
            taskHistory.forEach(r => {
                if (r.status === 'completed' || r.status === 'avoided') successfulDates.add(r.dateString);
            });

            const todayString = new Date().toISOString().split('T')[0];
            const getStr = (d) => d.toISOString().split('T')[0];

            let currentStreak = 0;
            let bestStreak = 0;
            const sortedSuccess = Array.from(successfulDates).sort();
            if (sortedSuccess.length > 0) {
                let tempStreak = 1;
                bestStreak = 1;
                for (let i = 1; i < sortedSuccess.length; i++) {
                    const prev = new Date(sortedSuccess[i-1] + 'T00:00:00Z');
                    const curr = new Date(sortedSuccess[i] + 'T00:00:00Z');
                    const diffDays = Math.ceil(Math.abs(curr - prev) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 1) {
                        tempStreak++;
                        if (tempStreak > bestStreak) bestStreak = tempStreak;
                    } else {
                        tempStreak = 1;
                    }
                }
            }

            let checkDate = new Date(todayString + 'T00:00:00Z');
            let cStr = getStr(checkDate);
            if (successfulDates.has(cStr)) currentStreak++;
            
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

            const last7Dates = [];
            const iterDate = new Date(todayString + 'T00:00:00Z');
            for (let i = 0; i < 7; i++) {
                last7Dates.push(getStr(iterDate));
                iterDate.setDate(iterDate.getDate() - 1);
            }
            last7Dates.reverse();

            let weekCompleted = 0;
            last7Dates.forEach(d => {
                if (successfulDates.has(d)) weekCompleted++;
            });
            const avgProductivity = Math.round((weekCompleted / 7) * 100);

            let countCompleted = 0;
            let countMissed = 0;
            let countPending = 0;
            let countAvoided = 0;
            
            last7Dates.forEach(d => {
                const record = taskHistory.find(h => h.dateString === d);
                if (record) {
                    if (record.status === 'completed') countCompleted++;
                    else if (record.status === 'missed' || record.status === 'failed') countMissed++;
                    else if (record.status === 'avoided') countAvoided++;
                    else countPending++;
                } else {
                    countPending++;
                }
            });

            return {
                task,
                metrics: {
                    currentStreak,
                    bestStreak,
                    avgProductivity,
                    weekCompleted,
                    last7Dates,
                    successfulDates: Array.from(successfulDates),
                    pieData: { countCompleted, countMissed, countPending, countAvoided }
                }
            };
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.get("/", async (req, res) => {
    try {
        const records = await Analytics.find({ userId: req.user.userId }).sort({ timestamp: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const { action, metadata } = req.body;
        const record = new Analytics({
            userId: req.user.userId,
            action,
            metadata
        });
        await record.save();
        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
