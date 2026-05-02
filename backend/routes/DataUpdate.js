//===========================
//DataUpdate.js
// * רוותיר לעריכת פרטי משתמש מחובר
//============================

const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();
const bcrypt = require("bcrypt");

// מחזיר משתמש לפי id
function getUserById(userId, callback) {
  db.query(
    "SELECT username, full_name, phone, email FROM users WHERE user_id = ?",
    [userId],
    callback,
  );
}

// מחזיר נתוני משתמש מחובר
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "לא מחובר" });
  }

  const userId = req.session.user.user_id;

  getUserById(userId, (err, results) => {
    if (err) return res.status(500).json({ message: "שגיאת בשרת" });
    res.json(results[0]);
  });
});

// בונה שדות לעדכון
function buildUpdateFields(data) {
  const fields = [];
  const values = [];

  if (data.username) {
    fields.push("username = ?");
    values.push(data.username);
  }

  if (data.fullName) {
    fields.push("full_name = ?");
    values.push(data.fullName);
  }

  if (data.phone) {
    fields.push("phone = ?");
    values.push(data.phone);
  }

  if (data.email) {
    fields.push("email = ?");
    values.push(data.email);
  }

  return { fields, values };
}

// בודק כפילות שם משתמש
function checkUsernameExists(username, userId, callback) {
  db.query(
    "SELECT user_id FROM users WHERE username = ? AND user_id != ?",
    [username, userId],
    callback,
  );
}

// מצפין סיסמה
function hashPassword(password, callback) {
  bcrypt.hash(password, 10, callback);
}

// מריץ עדכון משתמש
function runUserUpdate(fields, values, userId, callback) {
  const sql = `
    UPDATE users
    SET ${fields.join(", ")}
    WHERE user_id = ?
  `;

  values.push(userId);
  db.query(sql, values, callback);
}

// מעדכן session
function updateSession(session, data) {
  if (data.username) session.user.username = data.username;
  if (data.fullName) session.user.full_name = data.fullName;
}

// עדכון משתמש
router.put("/update", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "לא מחובר" });
  }

  const userId = req.session.user.user_id;
  const data = req.body;

  const { fields, values } = buildUpdateFields(data);

  if (fields.length === 0 && !data.password) {
    return res.status(400).json({ message: "לא נשלחו נתונים לעדכון" });
  }

  function continueUpdate() {
    if (data.password) {
      hashPassword(data.password, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ message: "שגיאה בהצפנת הסיסמה" });
        }

        fields.push("password = ?");
        values.push(hashedPassword);

        executeUpdate();
      });
    } else {
      executeUpdate();
    }
  }

  function executeUpdate() {
    runUserUpdate(fields, values, userId, (err) => {
      if (err) return res.status(500).json({ message: "שגיאת שרת" });

      updateSession(req.session, data);
      res.json({ message: "הפרטים עודכנו בהצלחה" });
    });
  }

  if (data.username) {
    checkUsernameExists(data.username, userId, (err, results) => {
      if (err) return res.status(500).json({ message: "שגיאת שרת" });

      if (results.length > 0) {
        return res.status(400).json({ message: "שם המשתמש כבר קיים במערכת" });
      }

      continueUpdate();
    });
  } else {
    continueUpdate();
  }
});

module.exports = router;