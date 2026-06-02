const express = require("express");
const router = express.Router();
const DailyProgress = require("../models/DailyProgress");
const authMiddleware = require("../middleware/authMiddleware");

// Protect all progress routes
router.use(authMiddleware);

// Helper to get today's date string in YYYY-MM-DD
const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

const Task = require("../models/Task");

// Get dashboard aggregated data
router.get("/dashboard", async (req, res) => {
    try {
        const todayString = getTodayString();
        const userId = req.user.userId;

        const [tasks, allHistory] = await Promise.all([
            Task.find({ userId, active: { $ne: false } }).sort({ createdAt: -1 }),
            DailyProgress.find({ userId })
        ]);

        const todayProgress = allHistory.filter(h => h.dateString === todayString);
        const progressMap = new Map(todayProgress.map(p => [p.taskId.toString(), p.status]));

        let completedToday = 0;
        let pendingToday = 0;
        let skippedToday = 0;
        
        let dailyCompletedToday = 0;
        let dailyTotalToday = 0;

        const categorizedTasks = {
            doTasks: [],
            avoidTasks: [],
            weeklyGoals: [],
            monthlyGoals: []
        };

        const dailyTaskIds = new Set();
        tasks.forEach(t => {
            const isDaily = t.frequency !== 'Weekly' && t.frequency !== 'Monthly';
            if (isDaily) dailyTaskIds.add(t._id.toString());

            const status = progressMap.get(t._id.toString()) || 'pending';
            
            if (status === 'completed' || status === 'avoided') {
                completedToday++;
                if (isDaily) dailyCompletedToday++;
            } else if (status === 'skipped') {
                skippedToday++;
            } else {
                pendingToday++;
            }
            
            if (isDaily) dailyTotalToday++;

            const taskWithStatus = { ...t.toObject(), todayStatus: status };

            if (t.frequency === 'Monthly') {
                categorizedTasks.monthlyGoals.push(taskWithStatus);
            } else if (t.frequency === 'Weekly') {
                categorizedTasks.weeklyGoals.push(taskWithStatus);
            } else if (t.type === 'DO - Task to Complete') {
                categorizedTasks.doTasks.push(taskWithStatus);
            } else if (t.type === 'NOT TO DO - Avoid Task') {
                categorizedTasks.avoidTasks.push(taskWithStatus);
            }
        });

        // Streak Calculation
        // 1. Group history by date (only for daily tasks)
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
            // How many daily tasks existed on this date?
            const dateEnd = new Date(dateStr + 'T23:59:59Z'); // approximate end of day
            let tasksExisted = 0;
            tasks.forEach(t => {
                if (dailyTaskIds.has(t._id.toString()) && new Date(t.createdAt) <= dateEnd) {
                    tasksExisted++;
                }
            });

            if (tasksExisted === 0) {
                // Graceful handling of days with no daily tasks
                successfulDates.add(dateStr);
            } else {
                const completed = historyByDate[dateStr].completed;
                if ((completed / tasksExisted) * 100 >= 80) {
                    successfulDates.add(dateStr);
                }
            }
        });

        // Compute current and best streak
        let currentStreak = 0;
        let bestStreak = 0;
        let checkDate = new Date(todayString + 'T00:00:00Z');
        
        // Helper to format date as YYYY-MM-DD
        const getStr = (d) => d.toISOString().split('T')[0];

        // Best Streak (longest consecutive sequence in successfulDates)
        const sortedSuccess = Array.from(successfulDates).sort();
        if (sortedSuccess.length > 0) {
            let tempStreak = 1;
            bestStreak = 1;
            for (let i = 1; i < sortedSuccess.length; i++) {
                const prev = new Date(sortedSuccess[i-1] + 'T00:00:00Z');
                const curr = new Date(sortedSuccess[i] + 'T00:00:00Z');
                const diffTime = Math.abs(curr - prev);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    tempStreak++;
                    if (tempStreak > bestStreak) bestStreak = tempStreak;
                } else {
                    tempStreak = 1;
                }
            }
        }

        // Current Streak (starting from today or yesterday)
        let cStr = getStr(checkDate);
        if (successfulDates.has(cStr)) {
            currentStreak++;
        }
        // Move to yesterday
        checkDate.setDate(checkDate.getDate() - 1);
        cStr = getStr(checkDate);
        
        // If today wasn't successful, that's fine (day might not be over), but we check yesterday
        // If yesterday was successful, we keep counting backwards
        while (successfulDates.has(cStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
            cStr = getStr(checkDate);
        }
        
        // If today was not successful AND yesterday was not successful, current streak is 0
        if (!successfulDates.has(todayString) && !successfulDates.has(getStr(new Date(new Date(todayString + 'T00:00:00Z').setDate(new Date(todayString + 'T00:00:00Z').getDate() - 1))))) {
            currentStreak = 0; 
        }

        const totalTasks = tasks.length;
        // Today's Daily Completion Percentage
        const completionPercentage = dailyTotalToday > 0 ? Math.round((dailyCompletedToday / dailyTotalToday) * 100) : 0;

        // If today is not in DB yet but we calculated its percentage live from pending UI (wait, this is backend, so it's live from DB)
        // If we wanted the UI to reflect immediately, the frontend needs to compute it or we just use DB state.

        res.json({
            metrics: {
                completedToday,
                pendingToday,
                skippedToday,
                totalTasks,
                dailyCompletedToday,
                dailyTotalToday,
                completionPercentage,
                currentStreak,
                bestStreak
            },
            categorizedTasks
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get today's progress for all tasks
router.get("/today", async (req, res) => {
    try {
        const todayString = getTodayString();
        const progress = await DailyProgress.find({ 
            userId: req.user.userId,
            dateString: todayString
        });
        res.json(progress);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update today's progress for a specific task
router.put("/:taskId", async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'completed', 'skipped', 'missed'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const todayString = getTodayString();
        
        const progress = await DailyProgress.findOneAndUpdate(
            { 
                userId: req.user.userId, 
                taskId: req.params.taskId,
                dateString: todayString 
            },
            { 
                $set: { 
                    status, 
                    updatedAt: Date.now() 
                } 
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.json(progress);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Bulk update today's progress
router.post("/bulk", async (req, res) => {
    try {
        const { updates } = req.body; // { [taskId]: status, ... }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ message: "Invalid updates format" });
        }

        const todayString = getTodayString();
        const bulkOps = Object.keys(updates).map(taskId => ({
            updateOne: {
                filter: { userId: req.user.userId, taskId, dateString: todayString },
                update: { $set: { status: updates[taskId], updatedAt: Date.now() } },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await DailyProgress.bulkWrite(bulkOps);
        }

        res.json({ message: "Bulk update successful" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get historical progress (for analytics)
router.get("/history", async (req, res) => {
    try {
        const history = await DailyProgress.find({ 
            userId: req.user.userId 
        }).sort({ dateString: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
