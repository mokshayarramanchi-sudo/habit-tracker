global.crypto = require('crypto');

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const User = require("./models/User");

const app = express();

app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
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

const redirectIfAuthenticated = async (req, res, next) => {
  const token = req.cookies?.habit_session;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded.userId,
      "sessions.token": token
    }).select("_id");

    if (user) {
      return res.redirect("/home");
    }
  } catch (error) {
    // Ignore invalid cookies and continue to the requested page.
  }

  return next();
};

const pages = [
  'tasks', 'analytics', 'task-analytics', 'diary', 
  'future-plans', 'about', 'profile',
  'forgot', 'verify-otp', 'reset-password'
];

pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `public/html/${page}.html`));
  });
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/home.html'));
});

app.get('/', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/main.html'));
});

app.get('/main', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/main.html'));
});

app.get('/signin', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/signin.html'));
});

app.get('/signup', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/html/signup.html'));
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