// ===================================
// ראוטר לחלון פופה יוצר משימה חדשה מתוך דיווח
// ===================================


const express = require("express");
const router = express.Router();

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();


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
    }
  );
});

/**
 * =========================================
 * POST
 * יצירת משימה חדשה + שיוך עובדים + עדכון דיווח
 * =========================================
 */
router.post("/tasks", (req, res) => {
  // =========================
  // קבלת נתונים מהלקוח
  // =========================
  const {
    task_type,
    description,
    image,
    start_time,
    due_time,
    report_id,
    latitude,
    longitude,
    workers,
  } = req.body;

  // =========================
  // בדיקות בסיסיות
  // =========================
  if (!task_type || !description || !image || !start_time || !due_time) {
    return res.status(400).json({
      message: "חסרים נתוני חובה במשימה",
    });
  }

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      message: "חסר מיקום למשימה",
    });
  }

  if (!Array.isArray(workers) || workers.length === 0) {
    return res.status(400).json({
      message: "חייב לבחור לפחות עובד אחד",
    });
  }

  // =========================
  // בדיקה שלכל עובד יש user_id ותפקיד
  // =========================
  for (const worker of workers) {
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
        longitude
      )
      VALUES (?, ?, ?, 'פתוחה', ?, ?, ?, ?, ?)
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
      const taskWorkersValues = workers.map((worker) => [
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
