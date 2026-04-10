//===========================
//רוותיר לניהול ניווט שטח בזמן אמת + דיווח בעיה
//============================

const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

const multer = require("multer");
const path = require("path");

// ===============================
// שליחת מייל דחוף למנהל על דיווח סכנה
// ===============================
const nodemailer = require("nodemailer");

// שימוש ב-ENV כמו בקובץ auth.js
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendDangerReportEmail({
  description,
  imagePath,
  reportTime,
  fullName,
  phone,
  email,
  trailName,
  emails,
}) {
  //  שולח ללוגין בלבד (כמו שסיכמנו)
  const link = `http://localhost:3000/login`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: emails,
    subject: "🚨 דיווח חדש מהשטח - סכנה",

    html: `
<div dir="rtl" style="font-family:Arial;text-align:right;line-height:1.6">

  <h1 style="color:#2563eb;">
    📢 הודעה דחופה ממערכת TrailQuest
  </h1>

  <h2 style="color:red;">
    🚨 דיווח סכנה מהשטח
  </h2>

  <hr/>

  <p><b>שם המסלול:</b> ${trailName}</p>

  <p><b>שם המדווח:</b> ${fullName}</p>

  <p><b>טלפון:</b> 
    <a href="tel:${phone}">${phone}</a>
  </p>

  <p><b>אימייל:</b> ${email}</p>

  <hr/>

  <p><b>תיאור הבעיה:</b><br>${description}</p>

  <p><b>זמן דיווח:</b> ${reportTime}</p>

  <p>
    <img src="http://localhost:3001/${imagePath}" 
         style="width:250px;border-radius:8px;"/>
  </p>

  <a href="${link}" 
     style="display:inline-block;
            margin-top:10px;
            padding:10px 18px;
            background:#2563eb;
            color:white;
            text-decoration:none;
            border-radius:6px;">
    כניסה למערכת
  </a>


</div>
`,
  });
}

/* ==============================
   Multer – שמירת תמונות
============================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/reports/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/* ==============================
   GET מסלול לניווט
============================== */
router.get("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "SELECT * FROM trails WHERE trail_id = ?";

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    if (!results.length) {
      return res.status(404).json({ message: "המסלול לא נמצא" });
    }

    res.json(results[0]);
  });
});

router.get("/group/:groupId", (req, res) => {
  const { groupId } = req.params;

  const sql = `
    SELECT t.*
    FROM groups g
    JOIN trails t ON g.trail_id = t.trail_id
    WHERE g.group_id = ?
  `;

  db.query(sql, [groupId], (err, results) => {
    if (err) return res.status(500).json({ message: "שגיאת שרת" });

    if (!results.length) {
      return res.status(404).json({ message: "המסלול לא נמצא" });
    }

    res.json(results[0]);
  });
});

//=====================================
// שליפת הגדרה מהמערכת לפי שם
//=====================================
function getSetting(name) {
  return new Promise((resolve, reject) => {
    // שליפת ערך מהטבלה
    db.query(
      "SELECT setting_value FROM system_settings WHERE setting_name = ?",
      [name],
      (err, result) => {
        // שגיאת DB
        if (err) return reject(err);

        // אם לא נמצא
        if (!result.length) {
          return resolve(null);
        }

        // החזרת הערך כמספר
        resolve(Number(result[0].setting_value));
      },
    );
  });
}
/* ==============================
   POST דיווח מהשטח (תמונה חובה)
============================== */
router.post("/:groupId/report", upload.single("image"), async (req, res) => {
  const { groupId } = req.params;

  const { user_id, latitude, longitude, problem_type, description } = req.body;

  const errors = [];

  // התחברות
  if (!user_id) errors.push("צריך להתחבר");

  // GPS
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!latitude || !longitude) {
    errors.push("חסר מיקום GPS");
  } else if (Number.isNaN(lat) || Number.isNaN(lng)) {
    errors.push("מיקום GPS לא תקין");
  }

  // שדות חובה
  if (!problem_type) errors.push("חובה לבחור סוג בעיה");
  if (!description) errors.push("חובה להזין תיאור");

  // תמונה
  if (!req.file) errors.push("חובה לצרף תמונה");

  if (errors.length > 0) {
    return res.status(400).json({
      message: errors.join(" וגם "),
    });
  }

  try {
    // בדיקה שהמשתמש שייך לקבוצה
    const userCheck = await checkUserInGroup(user_id, groupId);
    if (!userCheck.ok) {
      return res.status(403).json({ message: userCheck.message });
    }

    //  בדיקה שהטיול בתהליך
    const activeCheck = await checkGuidanceActive(groupId);
    if (!activeCheck.ok) {
      return res.status(400).json({ message: activeCheck.message });
    }

    //  בדיקת כמות דיווחים
    const limitCheck = await checkReportLimit(user_id, groupId);
    if (!limitCheck.ok) {
      return res.status(400).json({ message: limitCheck.message });
    }

    //  בדיקת זמן
    const timeCheck = await checkReportCooldown(user_id, groupId);
    if (!timeCheck.ok) {
      return res.status(400).json({ message: timeCheck.message });
    }

    //  שליפת trail_id מתוך group
    const trailResult = await new Promise((resolve, reject) => {
      db.query(
        "SELECT trail_id FROM groups WHERE group_id = ?",
        [groupId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    if (!trailResult.length) {
      return res.status(404).json({ message: "הטיול לא נמצא" });
    }

    const trail_id = trailResult[0].trail_id;

    const imagePath = `uploads/reports/${req.file.filename}`;

    //  INSERT נכון
    const insertSql = `
      INSERT INTO reports
      (user_id, trail_id, group_id, latitude, longitude, problem_type, description, image_path, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'חדש')
    `;

db.query(
  insertSql,
  [user_id, trail_id, groupId, lat, lng, problem_type, description, imagePath],
  async (err2) => {
    if (err2) {
      console.error(err2);
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    //  קריאה לפונקצית עזר לשליחת מיל דחוף למנהל
    if (problem_type === "סכנה") {
      await handleDangerReport(user_id, description, imagePath, groupId);
    }

    res.json({ message: "הדיווח נשלח בהצלחה" });
  },
);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "שגיאת שרת" });
  }
});

//=====================================
// בדיקה שעבר זמן מינימלי בין דיווחים
//======================================
async function checkReportCooldown(user_id, group_id) {
  // שליפת זמן מהמערכת
  const interval = await getSetting("report_interval_minutes");

  return new Promise((resolve, reject) => {
    const sql = `
      SELECT report_time
      FROM reports
      WHERE user_id = ? AND group_id = ?
      ORDER BY report_time DESC
      LIMIT 1
    `;

    db.query(sql, [user_id, group_id], (err, result) => {
      if (err) return reject(err);

      // אם אין דיווח קודם
      if (!result.length) {
        return resolve({ ok: true });
      }

      const lastTime = new Date(result[0].report_time);
      const now = new Date();

      const diffMinutes = (now - lastTime) / (1000 * 60);

      // אם מוגדר 0 → אין הגבלה בכלל
      if (interval === 0) {
        return resolve({ ok: true });
      }

      // אם לא עבר מספיק זמן
      if (interval !== null && diffMinutes < interval) {
        return resolve({
          ok: false,
          message: `יש להמתין ${interval} דקות בין דיווחים`,
        });
      }

      resolve({ ok: true });
    });
  });
}

// ===========================================
// טיפול בדיווח סכנה (שליחת מייל דחוף להמנהל  עם פרטי הדיווח)
// ==============================================
async function handleDangerReport(user_id, description, imagePath, group_id) {
  try {
    // שליפת פרטי המשתמש
    const userResult = await new Promise((resolve, reject) => {
      db.query(
        "SELECT full_name, phone, email FROM users WHERE user_id = ?",
        [user_id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    const fullName = userResult[0].full_name;
    const phone = userResult[0].phone;
    const email = userResult[0].email;

    // שליפת שם המסלול לפי group
    const trailResult = await new Promise((resolve, reject) => {
      db.query(
        `SELECT t.trail_name 
         FROM groups g
         JOIN trails t ON g.trail_id = t.trail_id
         WHERE g.group_id = ?`,
        [group_id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    const trailName = trailResult[0]?.trail_name || "לא ידוע";

    // שליפת כל המנהלים
    const admins = await new Promise((resolve, reject) => {
      db.query("SELECT email FROM users WHERE role = 'מנהל'", (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // הפיכה למערך של מיילים
    const emails = admins.map((a) => a.email);

    if (!emails.length) {
      console.log("אין מנהלים לשליחת מייל");
      return;
    }

    // שליחת מייל
    await sendDangerReportEmail({
      description,
      imagePath,
      reportTime: new Date().toLocaleString(),
      fullName,
      phone,
      email,
      trailName,
      emails,
    });
  } catch (err) {
    console.error("שגיאה בטיפול בדיווח סכנה:", err);
  }
}


//===============================
// בדיקה שלא עברנו את כמות הדיווחים המותרת
//============================
async function checkReportLimit(user_id, group_id) {
  // שליפת הגדרה מהמערכת
  const maxReports = await getSetting("max_reports_per_route");

  return new Promise((resolve, reject) => {
    const sql = `
      SELECT COUNT(*) AS total
      FROM reports
      WHERE user_id = ? AND group_id = ?
    `;

    db.query(sql, [user_id, group_id], (err, result) => {
      if (err) return reject(err);

      // אם 0 → אסור בכלל לדווח
      if (maxReports === 0) {
        return resolve({
          ok: false,
          message: "דיווחים אינם זמינים במסלול זה",
        });
      }

      // אם עברנו את המקסימום
      if (maxReports !== null && result[0].total >= maxReports) {
        return resolve({
          ok: false,
          message: `הגעת למספר הדיווחים המקסימלי (${maxReports})`,
        });
      }

      resolve({ ok: true });
    });
  });
}

//===================================
// בדיקה שהטיול מתבצע כרגע (בתהליך)
//===================================
function checkGuidanceActive(group_id) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT guidance_id
      FROM guidances
      WHERE group_id = ? AND status = 'בתהליך'
      LIMIT 1
    `;

    db.query(sql, [group_id], (err, result) => {
      if (err) return reject(err);

      // אם אין טיול שמתבצע כרגע
      if (!result.length) {
        return resolve({
          ok: false,
          message: "ניתן לדווח רק בזמן שהטיול מתבצע בפועל",
        });
      }

      resolve({ ok: true });
    });
  });
}

//=====================================
// בדיקה שהמשתמש שייך לקבוצה
//=====================================
function checkUserInGroup(user_id, group_id) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT g.group_id
      FROM groups g
      JOIN trip_requests tr ON g.request_id = tr.request_id
      WHERE g.group_id = ?
      AND (g.guide_id = ? OR tr.user_id = ?)
    `;

    db.query(sql, [group_id, user_id, user_id], (err, result) => {
      if (err) return reject(err);

      // אם המשתמש לא שייך לקבוצה
      if (!result.length) {
        return resolve({
          ok: false,
          message: "אין לך הרשאה לדווח על טיול זה",
        });
      }

      resolve({ ok: true });
    });
  });
}

module.exports = router;
