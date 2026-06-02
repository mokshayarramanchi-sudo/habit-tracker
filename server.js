global.crypto = require('crypto');

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const authRoutes = require("./routes/authRoutes");
const auth = require("./routes/auth");
const tasksRoutes = require("./routes/tasksRoutes");
// Routes for User-Based Data Isolation & Features
const userRoutes = require("./routes/userRoutes");
const diaryRoutes = require("./routes/diaryRoutes");
const futurePlanRoutes = require("./routes/futurePlanRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const dailyProgressRoutes = require("./routes/dailyProgressRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

app.use("/api/auth", auth);
app.use("/api/auth", authRoutes);
// Mount new routes protected by authMiddleware
app.use("/api/users", userRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/progress", dailyProgressRoutes);
app.use("/api/diary", diaryRoutes);
app.use("/api/future-plans", futurePlanRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);

const pages = [
  'home', 'tasks', 'analytics', 'task-analytics', 'diary', 
  'future-plans', 'about', 'profile', 'signin', 'signup', 
  'forgot', 'verify-otp', 'reset-password', 'main'
];

pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `public/html/${page}.html`));
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/main.html'));
});

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected");
})
.catch((err) => {
    console.log("MongoDB connection error:", err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});