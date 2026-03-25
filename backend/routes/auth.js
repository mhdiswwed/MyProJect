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
//routes/user.js
const dbSingleton = require("../dbSingleton");

// Execute a query to the database
const db = dbSingleton.getConnection();
//השוואת הצפנת צצמאות
const bcrypt = require("bcrypt");
// ספרייה ליצירת טוקן אקראי לאימות אימייל
const crypto = require("crypto");
// ספרייה לשליחת מיילים
const nodemailer = require("nodemailer");

// יצירת חיבור לחשבון Gmail
/**
 * יצירת חיבור ל-Gmail באמצעות משתני סביבה
 * כך שהסיסמה לא תהיה חשופה בקוד
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // נלקח מקובץ .env
    pass: process.env.EMAIL_PASS, // נלקח מקובץ .env
  },
});
/**
 * התחברות משתמש למערכת
 *
 * מקבל שם משתמש וסיסמה מה־Frontend
 * בודק התאמה באמצעות bcrypt
 */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // חיפוש משתמש לפי שם משתמש בלבד
  const sql = "SELECT * FROM users WHERE username = ?";

  db.query(sql, [username], (err, results) => {
    // שגיאת שרת
    if (err) {
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    // אם המשתמש לא קיים
    if (results.length === 0) {
      return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
    }

    // בדיקה אם המשתמש עדיין לא אימת את האימייל
    if (!results[0].is_verified) {
      return res.status(403).json({
        message: "יש לאמת את האימייל לפני התחברות",
      });
    }

    // שליפת הסיסמה המוצפנת מהמסד
    const hashedPassword = results[0].password;

    // השוואת הסיסמה שהוזנה ל־hash
    bcrypt.compare(password, hashedPassword, (err, isMatch) => {
      // שגיאה בזמן ההשוואה
      if (err) {
        return res.status(500).json({ message: "שגיאת שרת" });
      }

      // אם הסיסמה לא תואמת
      if (!isMatch) {
        return res.status(401).json({ message: "שם משתמש או סיסמה שגויים" });
      }

      // שמירת המשתמש ב־session
      const safeUser = {
        user_id: results[0].user_id,
        username: results[0].username,
        full_name: results[0].full_name,
        role: results[0].role,
      };

      req.session.user = safeUser;

      // console.log("Logged in user:", req.session.user);//הדפסה בקונסול פרטי המשתמש המחובר
      // התחברות הצליחה
      res.json({
        message: "התחברות הצליחה",
        user: safeUser,
      });
    });
  });
});



/**
 * הרשמת משתמש חדש למערכת
 *
 * תהליך:
 * 1. בדיקה האם שם משתמש או אימייל כבר קיימים
 * 2. אם קיימים – החזרת הודעת שגיאה מתאימה (400)
 * 3. אם לא קיימים – הצפנת סיסמה
 * 4. יצירת טוקן לאימות אימייל
 * 5. הכנסת המשתמש למסד הנתונים
 * 6. שליחת מייל אימות
 */
router.post("/register", (req, res) => {
  // שליפת הנתונים מה־Frontend
  const { username, password, fullName, phone, email } = req.body;

  /**
   * בדיקה האם כבר קיים משתמש עם:
   * - אותו שם משתמש
   * - או אותו אימייל
   *
   * שני השדות חייבים להיות ייחודיים במערכת
   */
  const checkSql = `
    SELECT username, email
    FROM users
    WHERE username = ? OR email = ?
  `;

  db.query(checkSql, [username, email], (err, results) => {
    // שגיאת שרת בגישה למסד
    if (err) {
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    /**
     * אם נמצא משתמש קיים
     * נבדוק האם הבעיה בשם המשתמש או באימייל
     */
    if (results.length > 0) {
      if (results[0].username === username) {
        return res.status(400).json({ message: "שם המשתמש כבר קיים" });
      }

      if (results[0].email === email) {
        return res.status(400).json({ message: "האימייל כבר רשום במערכת" });
      }
    }

    /**
     * אם לא נמצא משתמש קיים
     * נמשיך לתהליך יצירת המשתמש
     */

    // מספר סבבי הצפנה (סטנדרט מקובל)
    const saltRounds = 10;

    // הצפנת הסיסמה לפני שמירה במסד
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ message: "שגיאה בהצפנת הסיסמה" });
      }

      // יצירת טוקן אקראי לאימות אימייל
      const verificationToken = crypto.randomBytes(32).toString("hex");

      /**
       * שאילתת הכנסת משתמש חדש למסד הנתונים
       * המשתמש יישמר כלא מאומת עד שילחץ על קישור האימות
       */
      const insertSql = `
        INSERT INTO users
        (username, password, full_name, phone, email, is_verified, verification_token)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        [
          username,
          hashedPassword,
          fullName,
          phone,
          email,
          false, // עדיין לא אומת
          verificationToken,
        ],
        (err) => {
          if (err) {
            return res.status(500).json({ message: "שגיאת שרת" });
          }

          // יצירת קישור אימות
          const verifyLink = `http://localhost:3001/api/auth/verify-email?token=${verificationToken}`;

          /**
           * שליחת מייל אימות למשתמש
           */
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

          // החזרת תגובת הצלחה
          res.status(201).json({
            message: "ההרשמה בוצעה בהצלחה! יש לאמת את האימייל לפני התחברות.",
          });
        },
      );
    });
  });
});

/**
 * ראוט לאימות אימייל
 * המשתמש ייכנס לכתובת עם token
 * המערכת תעדכן אותו כמאומת
 */
router.get("/verify-email", (req, res) => {
  // שליפת הטוקן מהכתובת
  const { token } = req.query;

  // חיפוש משתמש לפי הטוקן
  const sql = "SELECT * FROM users WHERE verification_token = ?";

  db.query(sql, [token], (err, results) => {
    if (err) return res.status(500).send("שגיאת שרת");

    // אם לא נמצא משתמש עם הטוקן הזה
    if (results.length === 0) {
      return res.status(400).send("טוקן לא תקין");
    }

    // עדכון המשתמש כמאומת
    const updateSql = `
      UPDATE users 
      SET is_verified = true, verification_token = NULL
      WHERE verification_token = ?
    `;

    db.query(updateSql, [token], (err) => {
      if (err) return res.status(500).send("שגיאת שרת");

      res.send("האימייל אומת בהצלחה! ניתן להתחבר כעת.");
    });
  });
});

/**
 * התנתקות משתמש
 * מוחק את ה־session
 */
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "התנתקות בוצעה בהצלחה" });
  });
});

/**
 * בדיקה מי המשתמש המחובר (session)
 * ה־Frontend משתמש בזה כדי לדעת אם המשתמש מחובר
 */
router.get("/me", (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
});

/**
 * בקשת איפוס סיסמה
 *
 * המשתמש מזין אימייל.
 * אם האימייל קיים במערכת:
 * 1. נוצר טוקן אקראי
 * 2. נשמר בדאטאבייס יחד עם זמן תפוגה (15 דקות)
 * 3. נשלח מייל עם קישור לאיפוס סיסמה
 *
 * אם האימייל לא קיים – מחזירים הודעה כללית (מטעמי אבטחה)
 */
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  // חיפוש משתמש לפי אימייל
  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    // לא חושפים אם המשתמש קיים או לא (אבטחה)
    if (results.length === 0) {
      return res.json({ message: "אם האימייל קיים, נשלח קישור לאיפוס." });
    }

    // יצירת טוקן אקראי לאיפוס סיסמה
    const resetToken = crypto.randomBytes(32).toString("hex");

    // קביעת זמן תפוגה – 15 דקות מהזמן הנוכחי
    const expires = new Date(Date.now() + 1000 * 60 * 15);

    // עדכון המשתמש בטוקן ובתפוגה
    const updateSql = `
      UPDATE users 
      SET reset_token = ?, reset_token_expires = ?
      WHERE email = ?
    `;

    db.query(updateSql, [resetToken, expires, email], async (err) => {
      if (err) {
        return res.status(500).json({ message: "שגיאת שרת" });
      }

      // יצירת קישור לאיפוס סיסמה (עמוד ב-React)
      const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

      // שליחת מייל למשתמש
      await transporter.sendMail({
        to: email,
        subject: "איפוס סיסמה - TrailQuest",
        html: `
<div dir="rtl" style="background:#0f172a;padding:40px 0;font-family:Arial,sans-serif;text-align:right;">
  <div style="max-width:500px;margin:auto;background:#111827;border-radius:16px;
              padding:30px;text-align:center;
              box-shadow:0 20px 40px rgba(0,0,0,.6);
              border:1px solid rgba(255,255,255,.18);">

    <!-- כותרת -->
    <h1 style="color:#facc15;margin-bottom:15px;">
      איפוס סיסמה
    </h1>

    <!-- פנייה אישית -->
    <p style="color:#e5e7eb;font-size:15px;margin-bottom:20px;">
      היי ${results[0].username},
    </p>

    <p style="color:#cbd5e1;font-size:14px;margin-bottom:25px;">
      התקבלה בקשה לאיפוס הסיסמה שלך במערכת TrailQuest.<br/>
      לחץ על הכפתור למטה כדי להגדיר סיסמה חדשה:
    </p>

    <!-- כפתור -->
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

      res.json({ message: "אם האימייל קיים, נשלח קישור לאיפוס." });
    });
  });
});

/**
 * איפוס סיסמה בפועל
 *
 * מקבל:
 * - token (מהקישור במייל)
 * - newPassword (הסיסמה החדשה)
 *
 * בודק:
 * - האם הטוקן קיים
 * - האם לא פג תוקף
 *
 * אם תקין:
 * - מצפין את הסיסמה החדשה
 * - מעדכן בדאטאבייס
 * - מוחק את הטוקן
 */
router.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  // בדיקה שהטוקן קיים ולא פג תוקף
  const sql = `
    SELECT * FROM users 
    WHERE reset_token = ? 
    AND reset_token_expires > NOW()
  `;

  db.query(sql, [token], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "קישור לא תקין או פג תוקף" });
    }

    /**
     * בדיקת תקינות סיסמה חדשה
     * דרישה:
     * - 3 עד 8 תווים
     * - לפחות אות אחת
     * - לפחות ספרה אחת
     * - ללא רווחים
     */
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{3,8}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "סיסמה חייבת להיות 3–8 תווים, עם לפחות אות אחת וספרה אחת.",
      });
    }

    const user = results[0];
    // השוואת הסיסמה החדשה לסיסמה הישנה
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        message: "הסיסמה החדשה חייבת להיות שונה מהסיסמה הקודמת.",
      });
    }
    // הצפנת הסיסמה החדשה
    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ message: "שגיאה בהצפנה" });
      }

      // עדכון הסיסמה ומחיקת הטוקן
      const updateSql = `
        UPDATE users
        SET password = ?, reset_token = NULL, reset_token_expires = NULL
        WHERE reset_token = ?
      `;

      db.query(updateSql, [hashedPassword, token], (err) => {
        if (err) {
          return res.status(500).json({ message: "שגיאת שרת" });
        }

        res.json({ message: "הסיסמה עודכנה בהצלחה" });
      });
    });
  });
});

/*
 * ייצוא הנתיבים לשימוש בקובץ server.js
 */
module.exports = router;
