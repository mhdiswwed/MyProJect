// ===================================
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

// אם התיקייה לא קיימת  ליצור
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
//מגדירים שם לתמונה
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const name = Date.now() + "-" + Math.floor(Math.random() * 1000);
    cb(null, `-${name}.${ext}`);
  },
});
//משתמשים בשם
const upload = multer({ storage });

// =========================================
// GET
// שליפת עובדים פנויים בלבד לפי זמן
// =========================================
router.get("/workers", (req, res) => {
  const { start_time, due_time } = req.query;

  // בדיקה אם הגיעו זמנים
  if (!start_time || !due_time) {
    return res.status(400).json({
      message: "חייב לשלוח זמן התחלה וסיום",
    });
  }

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
        -- חפיפה רגילה
        (t.start_time <= ? AND t.due_time >= ?)

        OR

        -- מרווח של 30 דקות
        (
          t.due_time > DATE_SUB(?, INTERVAL 30 MINUTE)
          AND t.start_time < DATE_ADD(?, INTERVAL 30 MINUTE)
        )
      )
    )

    ORDER BY u.full_name ASC
  `;

  db.query(
    sql,
    [start_time, due_time, start_time, due_time],
    (err, results) => {
      if (err) {
        console.error("שגיאה בשליפת עובדים:", err);
        return res.status(500).json({
          message: "שגיאה בשליפת עובדים",
        });
      }

      res.json(Array.isArray(results) ? results : []);
    },
  );
});

/**
 * =========================================
 * POST
 * יצירת משימה חדשה + שיוך עובדים + עדכון דיווח
 * =========================================
 */
router.post("/tasks", upload.single("image"), (req, res) => {
  // =========================
  // קבלת נתונים מהלקוח
  // =========================
  const {
    task_type,
    description,
    start_time,
    due_time,
    report_id,
    latitude,
    longitude,
    workers,
    trail_id,
  } = req.body;
let image = null;

// אם העלו קובץ (manual)
if (req.file) {
  image = `uploads/tasks/${req.file.filename}`;
}
// אם זה report → יש תמונה קיימת
else if (req.body.image) {
  image = req.body.image;
}

  // =========================
  // בדיקות בסיסיות
  // =========================
  if (!task_type || !description || !start_time || !due_time) {
    return res.status(400).json({
      message: "חסרים נתוני חובה במשימה",
    });
  }

  if (report_id && !image) {
    return res.status(400).json({
      message: "חסרה תמונה",
    });
  }

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      message: "חסר מיקום למשימה",
    });
  }

  const workersParsed = JSON.parse(workers);

  if (!Array.isArray(workersParsed) || workersParsed.length === 0) {
    return res.status(400).json({
      message: "חייב לבחור לפחות עובד אחד",
    });
  }

  // =========================
  // בדיקה שלכל עובד יש user_id ותפקיד
  // =========================
  for (const worker of workersParsed) {
    if (!worker.user_id || !worker.role) {
      return res.status(400).json({
        message: "חייב לבחור תפקיד לכל עובד",
      });
    }
  }

  // =========================
  // פתיחת טרנזקציה
  // =========================
  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error("שגיאה בפתיחת transaction:", transactionErr);
      return res.status(500).json({
        message: "שגיאה ביצירת משימה",
      });
    }

    // =========================
    // הכנסת המשימה לטבלת tasks
    // =========================
    const insertTaskSql = `
      INSERT INTO tasks
      (
        task_type,
        description,
        image,
        status,
        start_time,
        due_time,
        report_id,
        latitude,
        longitude,
        trail_id
      )
      VALUES (?, ?, ?, 'פתוחה', ?, ?, ?, ?, ?,?)
    `;

    const taskValues = [
      task_type,
      description,
      image,
      start_time,
      due_time,
      report_id || null,
      latitude,
      longitude,
      trail_id|| null,
    ];

    db.query(insertTaskSql, taskValues, (taskErr, taskResult) => {
      if (taskErr) {
        return db.rollback(() => {
          console.error("שגיאה בהכנסת משימה:", taskErr);
          res.status(500).json({
            message: "שגיאה ביצירת משימה",
          });
        });
      }

      // =========================
      // מזהה המשימה החדשה
      // =========================
      const taskId = taskResult.insertId;

      // =========================
      // בניית ערכים ל-task_workers
      // כל עובד עם התפקיד שלו
      // =========================
      const taskWorkersValues = workersParsed.map((worker) => [
        taskId,
        worker.user_id,
        worker.role,
      ]);

      const insertWorkersSql = `
        INSERT INTO task_workers
        (task_id, user_id, role)
        VALUES ?
      `;

      db.query(insertWorkersSql, [taskWorkersValues], (workersErr) => {
        if (workersErr) {
          return db.rollback(() => {
            console.error("שגיאה בהכנסת עובדים למשימה:", workersErr);
            res.status(500).json({
              message: "שגיאה בשיוך עובדים למשימה",
            });
          });
        }

        // =========================
        // אם יש report_id - מעדכנים את הדיווח ל"בטיפול"
        // =========================
        if (report_id) {
          const updateReportSql = `
            UPDATE reports
            SET status = 'בטיפול'
            WHERE report_id = ?
          `;

          db.query(updateReportSql, [report_id], (reportErr) => {
            if (reportErr) {
              return db.rollback(() => {
                console.error("שגיאה בעדכון סטטוס דיווח:", reportErr);
                res.status(500).json({
                  message: "המשימה נוצרה אך עדכון הדיווח נכשל",
                });
              });
            }

            // =========================
            // סיום transaction בהצלחה
            // =========================
            db.commit((commitErr) => {
              if (commitErr) {
                return db.rollback(() => {
                  console.error("שגיאה ב-commit:", commitErr);
                  res.status(500).json({
                    message: "שגיאה סופית ביצירת משימה",
                  });
                });
              }

              res.status(201).json({
                message: "המשימה נוצרה בהצלחה והדיווח הועבר לטיפול",
                task_id: taskId,
              });
            });
          });
        } else {
          // =========================
          // אם אין דיווח קשור - רק commit
          // =========================
          db.commit((commitErr) => {
            if (commitErr) {
              return db.rollback(() => {
                console.error("שגיאה ב-commit:", commitErr);
                res.status(500).json({
                  message: "שגיאה סופית ביצירת משימה",
                });
              });
            }

            res.status(201).json({
              message: "המשימה נוצרה בהצלחה",
              task_id: taskId,
            });
          });
        }
      });
    });
  });
});

module.exports = router;
