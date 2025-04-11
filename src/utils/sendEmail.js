const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const sendEmail = require("../utils/sendEmail");
// Create a transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // For Gmail, you can use another email service like Mailgun or SendGrid
  auth: {
    user: "moh18.kh@gmail.com",
    pass: "ergdecktsaiahbip",
  },
});

module.exports = asyncHandler(async (to, subject, text, html) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to,
    subject,
    text,
    html, 
  };
  await transporter.sendMail(mailOptions);
});
