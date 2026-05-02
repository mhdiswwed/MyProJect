/**
 * auth.js
 * קובץ נתיבים (routes) עבור התחברות והרשמה
 *
 * הקובץ מטפל בבקשות:
 * - התחברות משתמש קיים
 * - הרשמת משתמש חדש
 *
 * הקובץ משתמש במסד נתונים MySQL דרך הקובץ db.js
 */

const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// מחפש משתמש לפי שם משתמש
function findUserByUsername(username, callback) {
  db.query("SELECT * FROM users WHERE username = ?", [username], callback);
}

// בודק סיסמה מול hash
function comparePassword(password, hash, callback) {
  bcrypt.compare(password, hash, callback);
}

// יוצר אובייקט משתמש בטוח ל-session
function buildSafeUser(user) {
  return {
    user_id: user.user_id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
  };
}

// התחברות משתמש
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  findUserByUsername(username, (err, results) => {
    if (err) return res.status(500).json({ message: "שגיאת שרת" });

    if (results.length === 0) {
      return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
    }

    if (!results[0].is_verified) {
      return res
        .status(403)
        .json({ message: "יש לאמת את האימייל לפני התחברות" });
    }

    comparePassword(password, results[0].password, (err, isMatch) => {
      if (err) return res.status(500).json({ message: "שגיאת שרת" });

      if (!isMatch) {
        return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
      }

      const safeUser = buildSafeUser(results[0]);
      req.session.user = safeUser;

      res.json({ message: "התחברות הצליחה", user: safeUser });
    });
  });
});

// בודק אם משתמש קיים לפי שם משתמש או אמייל
function checkUserExists(username, email, callback) {
  const sql = `
    SELECT username, email
    FROM users
    WHERE username = ? OR email = ?
  `;
  db.query(sql, [username, email], callback);
}

// מצפין סיסמה
function hashPassword(password, callback) {
  bcrypt.hash(password, 10, callback);
}

// יוצר טוקן אימות
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// מכניס משתמש למסד
function insertUser(data, callback) {
  const sql = `
    INSERT INTO users
    (username, password, full_name, phone, email, is_verified, verification_token)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, data, callback);
}

// שולח מייל אימות עם העיצוב המקורי
function sendVerificationEmail(email, verifyLink) {
  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "אימות אימייל - TrailQuest",
    html: `
<div dir="rtl" style="background:#0f172a;padding:40px 0;font-family:Arial,sans-serif;text-align:right;">
  <div style="max-width:500px;margin:auto;background:#111827;border-radius:12px;padding:30px;text-align:center;color:white;box-shadow:0 0 25px rgba(0,0,0,0.6);">
    
    <h1 style="color:#facc15;margin-bottom:10px;">TrailQuest</h1>
    <p style="color:#9ca3af;margin-bottom:30px;">הרפתקה מתחילה כאן</p>

    <h2 style="margin-bottom:20px;">אימות חשבון</h2>

    <p style="color:#d1d5db;margin-bottom:30px;">
      כדי להתחיל להשתמש במערכת, יש לאמת את כתובת האימייל שלך.
    </p>

    <a href="${verifyLink}" 
       style="display:inline-block;padding:14px 28px;
              background:#facc15;
              color:#111827;
              text-decoration:none;
              font-weight:bold;
              border-radius:8px;
              box-shadow:0 4px 15px rgba(250,204,21,0.4);">
      אימות החשבון
    </a>

    <p style="margin-top:30px;color:#6b7280;font-size:13px;">
      אם לא נרשמת ל-TrailQuest, ניתן להתעלם ממייל זה.
    </p>

  </div>
</div>
`,
  });
}

// הרשמת משתמש
router.post("/register", (req, res) => {
  const { username, password, fullName, phone, email } = req.body;

  checkUserExists(username, email, (err, results) => {
    if (err) return res.status(500).json({ message: "שגיאת שרת" });

    if (results.length > 0) {
      if (results[0].username === username) {
        return res.status(400).json({ message: "שם המשתמש כבר קיים" });
      }
      if (results[0].email === email) {
        return res.status(400).json({ message: "האימייל כבר רשום" });
      }
    }

    hashPassword(password, (err, hashedPassword) => {
      if (err) return res.status(500).json({ message: "שגיאה בהצפנה" });

      const token = generateToken();

      insertUser(
        [username, hashedPassword, fullName, phone, email, false, token],
        (err) => {
          if (err) return res.status(500).json({ message: "שגיאת שרת" });

          const link = `http://localhost:3001/api/auth/verify-email?token=${token}`;
          sendVerificationEmail(email, link);

          res.status(201).json({ message: "נרשמת בהצלחה, בדוק אימייל" });
        },
      );
    });
  });
});

// מאמת משתמש לפי token
function findUserByToken(token, callback) {
  db.query(
    "SELECT * FROM users WHERE verification_token = ?",
    [token],
    callback,
  );
}

// מעדכן משתמש כמאומת
function verifyUser(token, callback) {
  const sql = `
    UPDATE users 
    SET is_verified = true, verification_token = NULL
    WHERE verification_token = ?
  `;
  db.query(sql, [token], callback);
}

// אימות אימייל
router.get("/verify-email", (req, res) => {
  const { token } = req.query;

  findUserByToken(token, (err, results) => {
    if (err) return res.status(500).send("שגיאת שרת");

    if (results.length === 0) {
      return res.status(400).send("טוקן לא תקין");
    }

    verifyUser(token, (err) => {
      if (err) return res.status(500).send("שגיאת שרת");

      res.send("האימייל אומת בהצלחה");
    });
  });
});

// התנתקות משתמש
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "התנתקות בוצעה בהצלחה" });
  });
});

// מחזיר את המשתמש המחובר
router.get("/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// מחפש משתמש לפי אימייל
function findUserByEmail(email, callback) {
  db.query("SELECT * FROM users WHERE email = ?", [email], callback);
}

// שומר טוקן איפוס
function saveResetToken(token, expires, email, callback) {
  const sql = `
    UPDATE users 
    SET reset_token = ?, reset_token_expires = ?
    WHERE email = ?
  `;
  db.query(sql, [token, expires, email], callback);
}

// שולח מייל איפוס סיסמה 
function sendResetEmail(email, resetLink, username) {
  transporter.sendMail({
    to: email,
    subject: "איפוס סיסמה - TrailQuest",
    html: `
<div dir="rtl" style="background:#0f172a;padding:40px 0;font-family:Arial,sans-serif;text-align:right;">
  <div style="max-width:500px;margin:auto;background:#111827;border-radius:16px;
              padding:30px;text-align:center;
              box-shadow:0 20px 40px rgba(0,0,0,.6);
              border:1px solid rgba(255,255,255,.18);">

    <h1 style="color:#facc15;margin-bottom:15px;">
      איפוס סיסמה
    </h1>

    <p style="color:#e5e7eb;font-size:15px;margin-bottom:20px;">
      היי ${username},
    </p>

    <p style="color:#cbd5e1;font-size:14px;margin-bottom:25px;">
      התקבלה בקשה לאיפוס הסיסמה שלך במערכת TrailQuest.<br/>
      לחץ על הכפתור למטה כדי להגדיר סיסמה חדשה:
    </p>

    <a href="${resetLink}"
       style="display:inline-block;
              padding:14px 28px;
              background:#facc15;
              color:#111827;
              text-decoration:none;
              font-weight:bold;
              border-radius:10px;
              box-shadow:0 10px 25px rgba(250,204,21,.3);">
      איפוס סיסמה
    </a>

    <p style="margin-top:25px;color:#94a3b8;font-size:13px;">
      הקישור תקף ל־15 דקות בלבד.
    </p>

    <p style="margin-top:10px;color:#6b7280;font-size:12px;">
      אם לא ביקשת לבצע איפוס סיסמה, ניתן להתעלם מהודעה זו.
    </p>

  </div>
</div>
`,
  });
}

// בקשת איפוס סיסמה
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  findUserByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ message: "שגיאת שרת" });

    if (results.length === 0) {
      return res.json({ message: "אם קיים, נשלח מייל" });
    }

    const token = generateToken();
    const expires = new Date(Date.now() + 1000 * 60 * 15);

    saveResetToken(token, expires, email, (err) => {
      if (err) return res.status(500).json({ message: "שגיאת שרת" });

      const link = `http://localhost:3000/reset-password/${token}`;
      sendResetEmail(email, link, results[0].username);

      res.json({ message: "אם קיים, נשלח מייל" });
    });
  });
});

// בודק token לאיפוס
function findResetToken(token, callback) {
  const sql = `
    SELECT * FROM users 
    WHERE reset_token = ? 
    AND reset_token_expires > NOW()
  `;
  db.query(sql, [token], callback);
}

// מעדכן סיסמה
function updatePassword(hash, token, callback) {
  const sql = `
    UPDATE users
    SET password = ?, reset_token = NULL, reset_token_expires = NULL
    WHERE reset_token = ?
  `;
  db.query(sql, [hash, token], callback);
}

// איפוס סיסמה
router.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  findResetToken(token, async (err, results) => {
    if (err) return res.status(500).json({ message: "שגיאת שרת" });

    if (results.length === 0) {
      return res.status(400).json({ message: "קישור לא תקין" });
    }

    const user = results[0];
    const isSame = await bcrypt.compare(newPassword, user.password);

    if (isSame) {
      return res.status(400).json({ message: "סיסמה חייבת להיות שונה" });
    }

    hashPassword(newPassword, (err, hash) => {
      if (err) return res.status(500).json({ message: "שגיאה בהצפנה" });

      updatePassword(hash, token, (err) => {
        if (err) return res.status(500).json({ message: "שגיאת שרת" });

        res.json({ message: "הסיסמה עודכנה" });
      });
    });
  });
});

module.exports = router;