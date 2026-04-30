//===========================
//DataUpdate.js
// * רוותיר לעריכת פרטי משתמש מחובר
//============================


const express = require("express");
const router = express.Router();
//routes/user.js
const dbSingleton = require("../dbSingleton");

// Execute a query to the database
const db = dbSingleton.getConnection();
//השוואת הצפנת צצמאות
const bcrypt = require("bcrypt");



//החזרת נתוני המשתמש המחובר
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "לא מחובר" });
  }

  const userId = req.session.user.user_id;

  db.query(
    "SELECT username, full_name, phone, email FROM users WHERE user_id = ?",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "שגיאת בשרת" });
      res.json(results[0]);
    },
  );
});




//==================================
// עדכון פרטי משתמש מחובר (עדכון חלקי)
//==================================
router.put("/update", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "לא מחובר" });
  }

  const userId = req.session.user.user_id;
  const { username, password, fullName, phone, email } = req.body;

  /* 
     בניית שדות לעדכון בצורה דינמית
  */
  const fields = [];
  const values = [];

  if (username) {
    fields.push("username = ?");
    values.push(username);
  }

  if (fullName) {
    fields.push("full_name = ?");
    values.push(fullName);
  }

  if (phone) {
    fields.push("phone = ?");
    values.push(phone);
  }

  if (email) {
    fields.push("email = ?");
    values.push(email);
  }

  /*
     אם אין שום דבר לעדכן
 */
  if (fields.length === 0 && !password) {
    return res.status(400).json({ message: "לא נשלחו נתונים לעדכון" });
  }

  /* 
     בדיקת כפילות שם משתמש (אם שונה)
 */
  if (username) {
    db.query(
      "SELECT user_id FROM users WHERE username = ? AND user_id != ?",
      [username, userId],
      (err, results) => {
        if (err) return res.status(500).json({ message: "שגיאת שרת" });

        if (results.length > 0) {
          return res.status(400).json({ message: "שם המשתמש כבר קיים במערכת" });
        }

        continueUpdate(); // ממשיכים לעדכון
      }
    );
  } else {
    continueUpdate();
  }

  /* 
     המשך עדכון (עם / בלי סיסמה)
 */
  function continueUpdate() {
    // אם יש סיסמה – מצפינים
    if (password) {
      const saltRounds = 10;

      bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ message: "שגיאה בהצפנת הסיסמה" });
        }

        fields.push("password = ?");
        values.push(hashedPassword);

        runUpdate();
      });
    } else {
      runUpdate();
    }
  }

  /* 
     הרצת UPDATE בפועל
  */
  function runUpdate() {
    const sql = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE user_id = ?
    `;

    values.push(userId);

    db.query(sql, values, (err) => {
      if (err) return res.status(500).json({ message: "שגיאת שרת" });

      // עדכון session (רק מה ששונה)
      if (username) req.session.user.username = username;
      if (fullName) req.session.user.full_name = fullName;

      res.json({ message: "הפרטים עודכנו בהצלחה" });
    });
  }
});


/*
 * ייצוא הנתיבים לשימוש בקובץ server.js
 */
module.exports = router;