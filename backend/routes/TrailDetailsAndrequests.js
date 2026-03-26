//==========================================================
// רוותר להצגת פרטים מסלול מסויים כולל חלון פופה לפקשות ליציאה לטיול כולל נייוט
//=========================================================

const express = require("express");
const router = express.Router();
//routes/user.js
const dbSingleton = require("../dbSingleton");
// Execute a query to the database
const db = dbSingleton.getConnection();

//=============================
// חשוב: אקספרס קורא רותיר מלמעלה למטה,
// לכן רותיר ספציפיים חייבים להיות לפני דינמיים

// ===============================
// החזרת מדריכים פנויים לפי תאריך ושעה
// ===============================
router.get("/available-guides", (req, res) => {
  // קבלת נתונים מה־query
  const { trip_date, trip_time, trail_id } = req.query;

  // בדיקה בסיסית
  if (!trip_date || !trip_time || !trail_id) {
    return res.status(400).json({ message: "חסר מידע" });
  }

  // ===============================
  // שליפת משך המסלול
  // ===============================
  const durationSql = `SELECT duration_minutes FROM trails WHERE trail_id = ?`;

  db.query(durationSql, [trail_id], (err, durationResult) => {
    if (err || durationResult.length === 0) {
      return res.status(500).json({ message: "שגיאה במסלול" });
    }

    // משך המסלול בדקות
    const duration = durationResult[0].duration_minutes;

    // זמן התחלה
    const newStart = new Date(`${trip_date}T${trip_time}`);

    // זמן סיום
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    // ⏱ הפסקה בין טיולים (30 דקות)
    const buffer = 30 * 60000;

    // ===============================
    // שליפת כל המדריכים
    // ===============================
    const guidesSql = `
      SELECT user_id, full_name
      FROM users
      WHERE role = 'מדריך'
    `;

    db.query(guidesSql, (err, guides) => {
      if (err) {
        return res.status(500).json({ message: "שגיאת שרת" });
      }

      // ===============================
      // בדיקת זמינות לכל מדריך
      // ===============================
      const availableGuides = [];

      let checked = 0;

      guides.forEach((guide) => {
   const checkSql = `
  SELECT trip_time, duration_minutes FROM (
    
    -- קבוצות פעילות
    SELECT g.trip_time, t.duration_minutes
    FROM groups g
    JOIN trails t ON g.trail_id = t.trail_id
    WHERE g.guide_id = ?
    AND g.trip_date = ?
    AND g.status = 'פעיל'

    UNION ALL

    -- בקשות מאושרות/ממתינות
    SELECT r.trip_time, t.duration_minutes
    FROM trip_requests r
    JOIN trails t ON r.trail_id = t.trail_id
    WHERE r.guide_id = ?
    AND r.trip_date = ?
    AND r.status IN ('ממתין','מאושר','מבקש ביטול')

  ) AS all_trips
`;

        db.query(checkSql, [guide.user_id, trip_date, guide.user_id, trip_date], (err, trips) => {
          if (err) return;

          let isAvailable = true;

          for (let trip of trips) {
            const existingStart = new Date(`${trip_date}T${trip.trip_time}`);
            const existingEnd = new Date(
              existingStart.getTime() + trip.duration_minutes * 60000
            );

            // מוסיפים הפסקה
            const existingEndWithBuffer = new Date(
              existingEnd.getTime() + buffer
            );

            // בדיקת חפיפה
            if (newStart < existingEndWithBuffer && newEnd > existingStart) {
              isAvailable = false;
              break;
            }
          }

          if (isAvailable) {
            availableGuides.push(guide);
          }

          checked++;

          // כשסיימנו לבדוק את כולם
          if (checked === guides.length) {
            res.json(availableGuides);
          }
        });
      });
    });
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


  // ===============================
// בדיקת זמן מינימלי להזמנה (לפחות 12 שעות מראש)
// ===============================
// זמן נוכחי
const now = new Date();
// זמן הטיול שהמשתמש בחר
const tripDateTime = new Date(`${trip_date}T${trip_time}`);
// חישוב הפרש שעות
const diffHours = (tripDateTime - now) / (1000 * 60 * 60);
// אם פחות מ־24 שעות → חוסמים
if (diffHours < 24) {
  return res.status(400).json({
    message: "יש להזמין טיול לפחות 24 שעות מראש ⏳",
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
