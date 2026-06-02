const nodemailer = require("nodemailer");

const sendMail = async (email, otp) => {

    try {

        const transporter = nodemailer.createTransport({

            service: "gmail",

            auth: {
                user: "mokshayarramanchi@gmail.com",
                pass: "przltbldsyqqvykg"
            }

        });

        const mailOptions = {

            from: "mokshayarramanchi@gmail.com",
            to: email,
            subject: "Password Reset OTP",

            html: `
                <h2>Password Reset OTP</h2>
                <h1>${otp}</h1>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("Email Sent:", info.response);

    } catch (error) {

        console.log(error);

    }
};

module.exports = sendMail;