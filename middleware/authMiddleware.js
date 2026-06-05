const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findOne({ 
            _id: decoded.userId,
            "sessions.token": token
        });

        if (!user) {
            return res.status(401).json({ message: "Session expired or logged out from another device" });
        }

        // Update lastActive timestamp
        await User.updateOne(
            { _id: decoded.userId, "sessions.token": token },
            { $set: { "sessions.$.lastActive": new Date() } }
        );

        req.user = decoded;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

module.exports = authMiddleware;
