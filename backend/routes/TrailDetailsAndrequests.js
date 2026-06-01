/*//============================================================================
TrailDetailsAndrequests.js
ראוטר צד משתמש להצגת פרטי מסלול וביצוע בקשת טיול – כולל שליפת מסלול, בדיקת זמינות מדריכים, מגבלות משתתפים, שעות פעילות, מע״מ ויצירת בקשת הצטרפות לטיול.
//=============================================================================*/

const express = require("express");
const router = express.Router();
//routes/user.js
const dbSingleton = require("../dbSingleton");
// Execute a query to the database
const db = dbSingleton.getConnection();

//=============================
//  פונקציה לשליפת שעות פעילות מטבלץ הגדרות המערכת
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
//=============================

// בודק נתונים
function isValidGuideRequest(data) {
  return data.trip_date && data.trip_time && data.trail_id;
}

// ממיר שעה לדקות
function toMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// מחזיר משך זמן המסלול
function getTrailDuration(trail_id, callback) {
  const sql = `SELECT duration_minutes FROM trails WHERE trail_id = ?`;
  db.query(sql, [trail_id], callback);
}

// מחשב זמני התחלה וסיום
function calculateTripTimes(trip_date, trip_time, duration) {
  const start = new Date(`${trip_date}T${trip_time}`);
  const end = new Date(start.getTime() + duration * 60000);
  return { start, end };
}

// בודק אם בתוך שעות עבודה
function isWithinWorkingHours(start, end, hours) {
  const [startH, startM] = hours.start.split(":").map(Number);
  const [endH, endM] = hours.end.split(":").map(Number);

  const workStart = startH * 60 + startM;
  const workEnd = endH * 60 + endM;

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();

  return !(startMin < workStart || endMin > workEnd);
}

// בודק חפיפות
function isGuideFree(trips, trip_time, duration, breakMinutes) {
  const newStartMin = toMinutes(trip_time);
  const newEndMin = newStartMin + duration;

  for (let trip of trips) {
    const existingStartMin = toMinutes(trip.trip_time);
    const existingEndMin = existingStartMin + trip.duration_minutes;

    const buffer = breakMinutes;

    const isBefore = newEndMin <= existingStartMin - buffer;
    const isAfter = newStartMin >= existingEndMin + buffer;

    if (!(isBefore || isAfter)) {
      return false;
    }
  }

  return true;
}

// מחזיר מדריכים פנויים
function loadGuides(trip_date, trip_time, duration, breakMinutes, res) {
  const guidesSql = `
    SELECT user_id, full_name
    FROM users
    WHERE role = 'מדריך'
  `;

  db.query(guidesSql, (err, guides) => {
    if (err) return res.status(500).json({ message: "שגיאת שרת" });

    const availableGuides = [];
    let checked = 0;

    guides.forEach((guide) => {
      const sql = `
        SELECT trip_time, duration_minutes FROM (
          SELECT g.trip_time, t.duration_minutes
          FROM groups g
          JOIN trails t ON g.trail_id = t.trail_id
          WHERE g.guide_id = ?
          AND g.trip_date = ?
          AND g.status = 'פעיל'

          UNION ALL

          SELECT r.trip_time, t.duration_minutes
          FROM trip_requests r
          JOIN trails t ON r.trail_id = t.trail_id
          WHERE r.guide_id = ?
          AND r.trip_date = ?
          AND r.status IN ('ממתין','מאושר','מבקש ביטול')
        ) AS all_trips
      `;

      db.query(sql, [guide.user_id, trip_date, guide.user_id, trip_date], (err, trips) => {
        if (!err) {
          const ok = isGuideFree(trips, trip_time, duration, breakMinutes);
          if (ok) availableGuides.push(guide);
        }

        checked++;

        if (checked === guides.length) {
          res.json(availableGuides);
        }
      });
    });
  });
}


// החזרת מדריכים פנויים לפי תאריך ושעה
router.get("/available-guides", (req, res) => {
  const data = req.query;

  if (!isValidGuideRequest(data)) {
    return res.status(400).json({ message: "חסר מידע" });
  }

  getWorkingHours((err, hours) => {
    if (err) return res.status(500).json({ message: "שגיאה" });

    getGuideBreak((breakMinutes) => {
      getTrailDuration(data.trail_id, (err, result) => {
        if (err || result.length === 0) {
          return res.status(500).json({ message: "שגיאה במסלול" });
        }

        const duration = result[0].duration_minutes;
        const { start, end } = calculateTripTimes(data.trip_date, data.trip_time, duration);

        if (!isWithinWorkingHours(start, end, hours)) {
          return res.json([]);
        }

        loadGuides(data.trip_date, data.trip_time, duration, breakMinutes, res);
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


// בודק נתונים בסיסיים לבקשה
function validateRequest(data) {
  const errors = [];

  if (!data.user_id) errors.push("צריך להתחבר");
  if (!data.trip_date) errors.push("חובה לבחור תאריך");
  if (!data.trip_time) errors.push("חובה לבחור שעה");
  if (!data.guide_id) errors.push("חובה לבחור מדריך");
  if (!data.trail_id) errors.push("חסר מזהה מסלול");

  if (
    data.number_of_vehicles === undefined ||
    data.number_of_vehicles === null ||
    Number(data.number_of_vehicles) < 0
  ) {
    errors.push("מספר כלי רכב חייב להיות 0 או מספר חיובי");
  }

  return errors;
}

// בודק טווח משתתפים לפי הגדרות
function validateParticipants(count, limits) {
  const { min, max } = limits;

  if (Number(count) < min || Number(count) > max) {
    return `מספר משתתפים חייב להיות בין ${min} ל-${max}`;
  }

  return null;
}

// בודק שההזמנה לפחות 24 שעות מראש
function isValidTime(trip_date, trip_time) {
  const now = new Date();
  const tripDateTime = new Date(`${trip_date}T${trip_time}`);
  const diffHours = (tripDateTime - now) / (1000 * 60 * 60);

  return diffHours >= 24;
}

// שומר בקשה במסד
function insertRequest(data, callback) {
  const trailSql = `
    SELECT price_per_person, price_per_vehicle
    FROM trails
    WHERE trail_id = ?
  `;

  db.query(trailSql, [data.trail_id], (err, trailRows) => {
    if (err || !trailRows.length) {
      return callback(err || new Error("המסלול לא נמצא"));
    }

    const pricePerPerson = Number(trailRows[0].price_per_person || 0);
    const pricePerVehicle = Number(trailRows[0].price_per_vehicle || 0);

    const sql = `
      INSERT INTO trip_requests
      (
        trip_date,
        trip_time,
        number_of_participants,
        number_of_vehicles,
        trail_id,
        user_id,
        guide_id,
        booking_price_per_person,
        booking_price_per_vehicle,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ממתין')
    `;

    db.query(
      sql,
      [
        data.trip_date,
        data.trip_time,
        Number(data.number_of_participants),
        Number(data.number_of_vehicles) || 0,
        data.trail_id,
        data.user_id,
        data.guide_id,
        pricePerPerson,
        pricePerVehicle,
      ],
      callback,
    );
  });
}


// יצירת בקשת הצטרפות
router.post("/request", (req, res) => {
  const data = req.body;

  const errors = validateRequest(data);

  getParticipantsLimits((err, limits) => {
    if (err) {
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    const participantsError = validateParticipants(
      data.number_of_participants,
      limits
    );

    if (participantsError) {
      errors.push(participantsError);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: errors.join(" וגם "),
      });
    }

    if (!isValidTime(data.trip_date, data.trip_time)) {
      return res.status(400).json({
        message: "יש להזמין טיול לפחות 24 שעות מראש ⏳",
      });
    }

    insertRequest(data, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "שגיאת שרת" });
      }

      res.json({ message: "הבקשה נשלחה בהצלחה" });
    });
  });
});

module.exports = router;
