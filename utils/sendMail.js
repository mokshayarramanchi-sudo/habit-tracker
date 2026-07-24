const nodemailer = require("nodemailer");

// Reusable pooled transporter to avoid TLS connection overhead per email
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "mokshayarramanchi@gmail.com",
        pass: "przltbldsyqqvykg"
    },
    family: 4,
    pool: true,
    maxConnections: 5
});

const sendMail = async (email, otp) => {
    const mailOptions = {
        from: '"Daily Habit Tracker" <mokshayarramanchi@gmail.com>',
        to: email,
        subject: "Password Reset OTP",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #4f46e5; text-align: center;">Daily Habit Tracker</h2>
                <p>Hello,</p>
                <p>Your OTP for resetting your password is:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; background: #f3f4f6; padding: 10px 20px; border-radius: 8px; display: inline-block;">${otp}</span>
                </div>
                <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
            </div>
        `
    };

    // Return promise so caller can await if desired, or handle asynchronously
    return transporter.sendMail(mailOptions);
};

module.exports = sendMail;