const express = require("express");
const router = express.Router();
//routes/user.js
const dbSingleton = require("../dbSingleton");
// Execute a query to the database
const db = dbSingleton.getConnection();




//=============================
// חשוב: אקספרס קורא רותיר מלמעלה למטה,
// לכן רותיר ספציפיים חייבים להיות לפני דינמיים
// ==========================
// מחזיר לי המדרכים
// ==========================
router.get("/guides", (req, res) => {
  const sql = `
    SELECT user_id, full_name
    FROM users
    WHERE role = 'מדריך'
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "שגיאת שרת" });
    }
    res.json(results);
  });
});


//=======================
//שליפת המע''מ
//=======================
router.get("/vat", (req, res) => {
  db.query(
    "SELECT setting_value FROM system_settings WHERE setting_name='vat'",
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "שגיאה במסד הנתונים" });
      }

      if (!rows.length) {
        return res.status(404).json({ message: "לא נמצא ערך מע״מ" });
      }

      res.json({ vat: Number(rows[0].setting_value) });
    },
  );
});


// ==============================
// מחזיר מסלול לפי ID
// ==============================
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM trails WHERE trail_id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "שגיאת שרת",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "המסלול לא נמצא",
      });
    }

    res.json(results[0]);
  });
});


// ==============================
// יצירת בקשת הצטרפות
// ==============================
router.post("/request", (req, res) => {
  const {
    trip_date,
    trip_time,
    number_of_participants,
    number_of_vehicles,
    trail_id,
    user_id,
    guide_id,
  } = req.body;
const errors = [];

// 1) התחברות
if (!user_id) {
  errors.push("צריך להתחבר");
}

// 2) תאריך
if (!trip_date || trip_date === "") {
  errors.push("חובה לבחור תאריך");
}

// 3) שעה
if (!trip_time || trip_time === "") {
  errors.push("חובה לבחור שעה");
}

// 4) משתתפים
if (!number_of_participants || Number(number_of_participants) < 1) {
  errors.push("מספר משתתפים חייב להיות 1 ומעלה");
}

// 5) מדריך
if (!guide_id) {
  errors.push("חובה לבחור מדריך");
}

// 6) מסלול
if (!trail_id) {
  errors.push("חסר מזהה מסלול");
}

// 7) מספר כלי רכב
if (
  number_of_vehicles === undefined ||
  number_of_vehicles === null ||
  Number(number_of_vehicles) < 0
) {
  errors.push("מספר כלי רכב חייב להיות 0 או מספר חיובי");
}

// אם יש שגיאות – מחזירים הודעה אחת (string)
if (errors.length > 0) {
  return res.status(400).json({
    message: errors.join(" וגם "),
  });
}

  const sql = `
    INSERT INTO trip_requests
    (trip_date, trip_time, number_of_participants, number_of_vehicles, trail_id, user_id, guide_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ממתין')
  `;

  db.query(
    sql,
    [
      trip_date,
      trip_time,
      Number(number_of_participants),
      Number(number_of_vehicles) || 0,
      trail_id,
      user_id,
      guide_id,
    ],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "שגיאת שרת" });
      }
      res.json({ message: "הבקשה נשלחה בהצלחה" });
    },
  );
});



module.exports = router;