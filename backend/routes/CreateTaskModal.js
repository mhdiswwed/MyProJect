// ===================================
//CreateTaskModal
// רוותיר : חלון פופה ליצירת משימה
// תומך ב-2 מצבים:
// 1. report - יצירה מתוך דיווח מהשטח (כולל מיקום ותמונה חובה)
// 2. manual - יצירה ידנית ע"י מנהל (כולל בחירת מסלול, תמונה אופציונלית)
// ===================================

const express = require("express");
const router = express.Router();

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadPath = path.join(__dirname, "../uploads/tasks");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const name = Date.now() + "-" + Math.floor(Math.random() * 1000);
    cb(null, `-${name}.${ext}`);
  },
});

const upload = multer({ storage });

// מחזיר זמן הפסקה לעובד
function getWorkerBreakMinutes(callback) {
  db.query(
    "SELECT setting_value FROM system_settings WHERE setting_name='worker_break_minutes'",
    (err, result) => {
      if (err || result.length === 0) return callback(30);
      callback(Number(result[0].setting_value));
    },
  );
}

// שולף עובדים פנויים לפי זמן
function getAvailableWorkers(start_time, due_time, breakMinutes, callback) {
  const sql = `
    SELECT u.user_id, u.full_name
    FROM users u
    WHERE u.role = 'עובד'
    AND u.active = 1
    AND NOT EXISTS (
      SELECT 1
      FROM task_workers tw
      JOIN tasks t ON t.task_id = tw.task_id
      WHERE tw.user_id = u.user_id
      AND (
        (t.start_time <= ? AND t.due_time >= ?)
        OR
        (
          t.due_time > DATE_SUB(?,INTERVAL ? MINUTE)
          AND t.start_time < DATE_ADD(?, INTERVAL ? MINUTE)
        )
      )
    )
    ORDER BY u.full_name ASC
  `;

  db.query(
    sql,
    [start_time, due_time, start_time, breakMinutes, due_time, breakMinutes],
    callback,
  );
}

// GET עובדים פנויים
router.get("/workers", (req, res) => {
  const { start_time, due_time } = req.query;

  if (!start_time || !due_time) {
    return res.status(400).json({ message: "חייב לשלוח זמן התחלה וסיום" });
  }

  getWorkerBreakMinutes((breakMinutes) => {
    getAvailableWorkers(start_time, due_time, breakMinutes, (err, results) => {
      if (err) {
        console.error("שגיאה בשליפת עובדים:", err);
        return res.status(500).json({ message: "שגיאה בשליפת עובדים" });
      }

      res.json(Array.isArray(results) ? results : []);
    });
  });
});

// מחזיר נתיב תמונה
function resolveImage(req) {
  if (req.file) return `uploads/tasks/${req.file.filename}`;
  if (req.body.image) return req.body.image;
  return null;
}

// בודק נתוני משימה
function validateTask(data, image, workersParsed) {
  if (
    !data.task_type ||
    !data.description ||
    !data.start_time ||
    !data.due_time
  )
    return "חסרים נתונים";
  if (data.report_id && !image) return "חסרה תמונה";
  if (data.latitude === undefined || data.longitude === undefined)
    return "חסר מיקום";
  if (!Array.isArray(workersParsed) || workersParsed.length === 0)
    return "חייב עובדים";

  for (const w of workersParsed) {
    if (!w.user_id || !w.role) return "חסר תפקיד";
  }

  return null;
}

// מכניס משימה
function insertTask(taskValues, callback) {
  const sql = `
    INSERT INTO tasks
    (task_type, description, image, status, start_time, due_time, report_id, latitude, longitude, trail_id)
    VALUES (?, ?, ?, 'פתוחה', ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, taskValues, callback);
}

// מכניס עובדים למשימה
function insertTaskWorkers(values, callback) {
  const sql = `
    INSERT INTO task_workers
    (task_id, user_id, role)
    VALUES ?
  `;
  db.query(sql, [values], callback);
}

// מעדכן דיווח
function updateReport(report_id, callback) {
  const sql = `
    UPDATE reports
    SET status = 'בטיפול'
    WHERE report_id = ?
  `;
  db.query(sql, [report_id], callback);
}

// מתחיל טרנזקציה
function startTransaction(callback) {
  db.beginTransaction(callback);
}

// מבצע rollback
function rollback(res, message, err) {
  db.rollback(() => {
    console.error(err);
    res.status(500).json({ message });
  });
}

// מבצע commit
function commit(res, message, taskId) {
  db.commit((err) => {
    if (err) {
      return rollback(res, "שגיאה סופית ביצירת משימה", err);
    }

    res.status(201).json({
      message,
      task_id: taskId,
    });
  });
}

// יצירת משימה
router.post("/tasks", upload.single("image"), (req, res) => {
  const data = req.body;
  const image = resolveImage(req);
  const workersParsed = JSON.parse(data.workers);

  const error = validateTask(data, image, workersParsed);
  if (error) return res.status(400).json({ message: error });

  startTransaction((err) => {
    if (err) return res.status(500).json({ message: "שגיאה ביצירת משימה" });

    const taskValues = [
      data.task_type,
      data.description,
      image,
      data.start_time,
      data.due_time,
      data.report_id || null,
      data.latitude,
      data.longitude,
      data.trail_id || null,
    ];

    insertTask(taskValues, (taskErr, taskResult) => {
      if (taskErr) return rollback(res, "שגיאה ביצירת משימה", taskErr);

      const taskId = taskResult.insertId;

      const workersValues = workersParsed.map((w) => [
        taskId,
        w.user_id,
        w.role,
      ]);

      insertTaskWorkers(workersValues, (workersErr) => {
        if (workersErr) return rollback(res, "שגיאה בשיוך עובדים", workersErr);

        if (data.report_id) {
          updateReport(data.report_id, (reportErr) => {
            if (reportErr) {
              return rollback(res, "עדכון דיווח נכשל", reportErr);
            }

            commit(res, "המשימה נוצרה והדיווח עודכן", taskId);
          });
        } else {
          commit(res, "המשימה נוצרה", taskId);
        }
      });
    });
  });
});

module.exports = router;