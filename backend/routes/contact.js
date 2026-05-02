/**
 * contact.js
 * --------------------------------------------------
 * ראוטר לשליחת טופס צור קשר
 *
 * מקבל נתונים מה-Frontend
 * ושולח מייל לבעל האתר
 */

const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// בודק אם שדות חובה קיימים
function validateContactData(data) {
  const { fullName, email, phone, message } = data;
  return fullName && email && phone && message;
}

// שולח מייל צור קשר עם העיצוב המקורי
function sendContactEmail(data) {
  const { fullName, email, phone, address, message } = data;

  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: "פנייה חדשה - TrailQuest",
    html: `
<div dir="rtl" style="font-family:Arial,sans-serif; background:#f9fafb; padding:30px;">
  
  <div style="max-width:500px;margin:auto;background:white;border-radius:10px;padding:25px;
              border:1px solid #e5e7eb;">
    
  <h2 style="margin-bottom:20px;color:#111827;">
     פנייה חדשה מאתר 
    <span dir="ltr">TrailQuest</span>
  </h2>

    <table style="width:100%;font-size:14px;color:#374151;">
      <tr>
        <td style="padding:6px 0;"><strong>שם מלא:</strong></td>
        <td>${fullName}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;"><strong>אימייל:</strong></td>
        <td>${email}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;"><strong>טלפון:</strong></td>
        <td>${phone}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;"><strong>כתובת:</strong></td>
        <td>${address || "-"}</td>
      </tr>
    </table>

    <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;" />

    <p style="margin-bottom:8px;"><strong>הודעה:</strong></p>

    <div style="background:#f3f4f6;padding:12px;border-radius:6px;color:#111;">
      ${message}
    </div>

  </div>
</div>
`,
  });
}

// שליחת טופס צור קשר
router.post("/send", async (req, res) => {
  const data = req.body;

  if (!validateContactData(data)) {
    return res.status(400).json({
      message: "נא למלא את כל השדות החובה",
    });
  }

  try {
    await sendContactEmail(data);
    res.json({ message: "ההודעה נשלחה בהצלחה" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "שגיאה בשליחת המייל" });
  }
});

module.exports = router;