const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const Groq = require("groq-sdk");
const Task = require("../models/Task");
const DailyProgress = require("../models/DailyProgress");
const Diary = require("../models/Diary");

// Lazy initialization of Groq AI
let groq = null;
const getGroqClient = () => {
    if (!groq && process.env.GROQ_API_KEY) {
        try {
            groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        } catch (e) {
            console.warn("Failed to initialize Groq:", e.message);
        }
    }
    return groq;
};

// Rate limiting: Max 15 messages per 1 minute per IP
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 15,
    message: { message: "You are sending messages too quickly. Please wait a moment." }
});

router.post("/", authMiddleware, chatLimiter, async (req, res) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ message: "Groq API key is missing from environment variables. If you recently deployed, ensure the GROQ_API_KEY is added to your hosting provider's environment variables dashboard." });
        }

        const groqClient = getGroqClient();
        if (!groqClient) {
            return res.status(500).json({ message: "Groq API client failed to initialize despite API key being present." });
        }

        const { message, chatHistory } = req.body;
        
        if (!message) {
            return res.status(400).json({ message: "Message is required." });
        }

        // Fetch User Data for Context
        const userId = req.user.userId || req.user.id;
        
        // 1. Fetch Active Tasks
        const activeTasks = await Task.find({ user: userId, active: true })
            .select('-_id name type frequency priority');
        
        // 2. Fetch Recent Progress (last 3 days)
        const recentProgress = await DailyProgress.find({ user: userId })
            .sort({ date: -1 })
            .limit(3)
            .select('-_id date completedTasks missedTasks skippedTasks completionPercentage');
            
        // 3. Fetch Recent Diary Entries (last 2)
        const recentDiary = await Diary.find({ user: userId })
            .sort({ date: -1 })
            .limit(2)
            .select('-_id date moodIcon title content');

        // Construct the prompt context
        const contextData = {
            activeTasks: activeTasks,
            recentProgress: recentProgress,
            recentDiary: recentDiary
        };

        const systemPrompt = `
You are a highly analytical, empathetic, and encouraging AI Productivity Coach.
Your goal is to help the user stay on track with their habits and tasks.

Here is the JSON context of the user's current state:
${JSON.stringify(contextData)}

Guidelines for your response:
1. Be concise, direct, and actionable. Avoid long walls of text.
2. Reference their actual tasks or recent diary entries if relevant to their message.
3. If they are struggling, be encouraging and suggest small, easy wins from their task list.
5. Do not output JSON, speak naturally like a human coach.
6. Use bullet points (- ) and **bold text** to format your suggestions so they are extremely easy to read. Avoid long paragraphs.
7. Maintain strict privacy and confidentiality. Never expose internal database IDs or repeat highly sensitive information verbatim.
8. If the user has no tasks or diary entries in the context, proactively suggest 3 popular daily habits they could start tracking.
9. You have READ-ONLY access. You cannot create, delete, or edit tasks for the user. If they ask you to modify their data, kindly instruct them to use the application's interface (e.g., Task Manager or Diary page).

App Overview (If the user asks how this app works, use this info):
- **Dashboard**: A quick overview of today's progress and quick actions.
- **Tasks**: Where users can create, edit, and track daily habits, one-time tasks, or long-term goals.
- **Analytics**: Deep visual insights, charts, and a calendar view of historical completion rates.
- **Diary**: A personal journaling space with mood tracking.
- **AI Coach**: You! An intelligent assistant that reviews progress and gives personalized advice.
- **Profile**: Account management, device security, and theme settings.
`;

        // Format history for Groq (OpenAI-compatible)
        const messages = [
            { role: "system", content: systemPrompt }
        ];

        if (chatHistory && Array.isArray(chatHistory)) {
            chatHistory.forEach(msg => {
                messages.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text
                });
            });
        }

        // Add the current message
        messages.push({ role: "user", content: message });

        const chatCompletion = await groqClient.chat.completions.create({
            messages: messages,
            model: "llama-3.1-8b-instant", // Updated to the latest supported model
            temperature: 0.7,
            max_tokens: 512,
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't formulate a response.";

        res.json({ reply: responseText });
    } catch (error) {
        console.error("Error in AI Chat:", error);
        res.status(500).json({ message: "An error occurred while communicating with the AI Coach: " + error.message });
    }
});

module.exports = router;
