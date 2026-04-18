//==========================================================
// רוותר להצגת פרטים מסלול מסויים כולל חלון פופה לבקשות ליציאה לטיול כולל נייוט
//=========================================================

const express = require("express");
const router = express.Router();
//routes/user.js
const dbSingleton = require("../dbSingleton");
// Execute a query to the database
const db = dbSingleton.getConnection();

//=============================
// פונקציה לשליפת שעות פעילות
//==============================
function getWorkingHours(callback) {
  const sql = `
    SELECT setting_name, setting_value
    FROM system_settings
    WHERE setting_name IN ('working_hours_start','working_hours_end')
  `;

  db.query(sql, (err, rows) => {
    if (err) return callback(err);

    let start = "08:00";
    let end = "18:00";

    rows.forEach((row) => {
      if (row.setting_name === "working_hours_start") {
        start = row.setting_value;
      }
      if (row.setting_name === "working_hours_end") {
        end = row.setting_value;
      }
    });

    callback(null, { start, end });
  });
}
//=================================
// פונקציה  לשליפת הפסקת מדריך
//===============================
function getGuideBreak(callback) {
  db.query(
    "SELECT setting_value FROM system_settings WHERE setting_name='guide_break_minutes'",
    (err, rows) => {
      if (err || !rows.length) return callback(30);

      callback(Number(rows[0].setting_value));
    },
  );
}

// ===============================
// פונקציה שמביאה מינימום ומקסימום משתתפים
// ===============================
function getParticipantsLimits(callback) {
  const sql = `
    SELECT setting_name, setting_value
    FROM system_settings
    WHERE setting_name IN ('min_participants', 'max_participants')
  `;

  db.query(sql, (err, rows) => {
    if (err) return callback(err);

    let min = 1;
    let max = 100;

    rows.forEach((row) => {
      if (row.setting_name === "min_participants") {
        min = Number(row.setting_value);
      }
      if (row.setting_name === "max_participants") {
        max = Number(row.setting_value);
      }
    });

    callback(null, { min, max });
  });
}

//=============================
// חשוב: אקספרס קורא רותיר מלמעלה למטה,
// לכן רותיר ספציפיים חייבים להיות לפני דינמיים

// ===============================
// החזרת מדריכים פנויים לפי תאריך ושעה
// ===============================
router.get("/available-guides", (req, res) => {
  const { trip_date, trip_time, trail_id } = req.query;

  if (!trip_date || !trip_time || !trail_id) {
    return res.status(400).json({ message: "חסר מידע" });
  }

  // ⏱ שליפת שעות פעילות + הפסקה
  getWorkingHours((err, hours) => {
    if (err) return res.status(500).json({ message: "שגיאה" });

    getGuideBreak((breakMinutes) => {
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

        // פירוק שעות עבודה
        const [startH, startM] = hours.start.split(":").map(Number);
        const [endH, endM] = hours.end.split(":").map(Number);

        const workStart = startH * 60 + startM;
        const workEnd = endH * 60 + endM;

        const startMinutes = newStart.getHours() * 60 + newStart.getMinutes();
        const endMinutes = newEnd.getHours() * 60 + newEnd.getMinutes();

        // אם מחוץ לשעות → אין מדריכים בכלל
        if (startMinutes < workStart || endMinutes > workEnd) {
          return res.json([]);
        }

        // הפסקה דינמית
        const buffer = breakMinutes * 60000;

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

            db.query(
              checkSql,
              [guide.user_id, trip_date, guide.user_id, trip_date],
              (err, trips) => {
                if (err) return;

                let isAvailable = true;

                // פונקציה שממירה שעה לדקות
                function toMinutes(timeStr) {
                  const [h, m] = timeStr.split(":").map(Number);
                  return h * 60 + m;
                }

                const newStartMin = toMinutes(trip_time);
                const newEndMin = newStartMin + duration;

                for (let trip of trips) {
                  const existingStartMin = toMinutes(trip.trip_time);
                  const existingEndMin =
                    existingStartMin + trip.duration_minutes;

                  const bufferMin = breakMinutes;

                  const isBefore = newEndMin <= existingStartMin - bufferMin;

                  const isAfter = newStartMin >= existingEndMin + bufferMin;

                  // אם לא לפני ולא אחרי → יש חפיפה
                  if (!(isBefore || isAfter)) {
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
              },
            );
          });
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

// ===============================
// שליפת מינימום ומקסימום משתתפים
// ===============================
router.get("/participants-limits", (req, res) => {
  const sql = `
    SELECT setting_name, setting_value
    FROM system_settings
    WHERE setting_name IN ('min_participants', 'max_participants')
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    const result = {};
    rows.forEach((row) => {
      result[row.setting_name] = Number(row.setting_value);
    });

    res.json({
      min: result.min_participants,
      max: result.max_participants,
    });
  });
});

//=================================================
// מחזיר את הקבוצה הפעילה של המשתמש במסלול הזה
//=================================================
router.get("/active-group/:trailId/:userId", (req, res) => {
  const { trailId, userId } = req.params;

  const sql = `
    SELECT g.group_id
    FROM groups g
    JOIN guidances gu ON g.group_id = gu.group_id
    LEFT JOIN trip_requests tr ON g.request_id = tr.request_id
    WHERE g.trail_id = ?
      AND gu.status = 'בתהליך'
      AND (g.guide_id = ? OR tr.user_id = ?)
    LIMIT 1
  `;

  db.query(sql, [trailId, userId, userId], (err, result) => {
    if (err) return res.status(500).json({ message: "שגיאת שרת" });

    if (!result.length) {
      return res.status(404).json({ message: "אין קבוצה פעילה למשתמש" });
    }

    res.json({ groupId: result[0].group_id });
  });
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

  // 4) מדריך
  if (!guide_id) {
    errors.push("חובה לבחור מדריך");
  }

  // 5) מסלול
  if (!trail_id) {
    errors.push("חסר מזהה מסלול");
  }

  // 6) מספר כלי רכב
  if (
    number_of_vehicles === undefined ||
    number_of_vehicles === null ||
    Number(number_of_vehicles) < 0
  ) {
    errors.push("מספר כלי רכב חייב להיות 0 או מספר חיובי");
  }
  // ===============================
  // שימוש בפונקציה קדי לבדוק מספר משתתפים מינמום ומקסימום לפי הגדרת המנהל שהגדיר בהגדרות המערכת (7)
  // ===============================
  getParticipantsLimits((err, limits) => {
    if (err) {
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    const { min, max } = limits;

    // 🔥 הבדיקה
    if (
      Number(number_of_participants) < min ||
      Number(number_of_participants) > max
    ) {
      errors.push(`מספר משתתפים חייב להיות בין ${min} ל-${max}`);
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
});

module.exports = router;
