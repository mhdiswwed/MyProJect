//===================================
// ראוטר: המשימות שלי (עובד)
//===================================

const express = require("express");
const router = express.Router();

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

/**
 * =========================================
 * GET
 * שליפת משימות לפי עובד
 * =========================================
 */
router.get("/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT
      t.task_id,
      t.task_type,
      t.status,
      t.start_time,
      te.start_time AS execution_start_time,
    te.image AS execution_image,
      t.due_time AS end_time ,
      t.description,
    t.image AS image_path,

      tr.trail_name,

      tw.role,



  r.latitude,
  r.longitude,
  tr.gpx_file

    FROM tasks t

    JOIN task_workers tw
      ON t.task_id = tw.task_id

     LEFT JOIN task_executions te
        ON t.task_id = te.task_id AND te.user_id = ?

    LEFT JOIN reports r
      ON t.report_id = r.report_id

    LEFT JOIN trails tr
      ON r.trail_id = tr.trail_id

    WHERE tw.user_id = ?

   ORDER BY
  CASE
    WHEN t.status = 'בטיפול' THEN 1
    WHEN t.status = 'פתוחה' THEN 2
    WHEN t.status = 'בוצעה' THEN 3
    WHEN t.status = 'בוטלה' THEN 4
  END,

  -- פתוחות לפי זמן סיום קרוב
  CASE 
    WHEN t.status = 'פתוחה' THEN t.due_time
    ELSE NULL
  END ASC,

  -- בטיפול לפי התחלה
  CASE 
    WHEN t.status = 'בטיפול' THEN te.start_time
    ELSE NULL
  END DESC,

  -- כל השאר לפי יצירה
  t.created_at DESC
  `;

  db.query(sql, [userId,userId], (err, results) => {
    if (err) {
      console.error("שגיאה בשליפת משימות:", err);
      return res.status(500).json({
        message: "שגיאה בשליפת משימות",
      });
    }

    res.json(results);
  });
});

/**
 * =========================================
 * PUT
 * התחלת משימה
 * =========================================
 */
router.post("/start/:taskId", (req, res) => {
  const { taskId } = req.params;
  const { user_id } = req.body; 

  const sql = `
    INSERT INTO task_executions
    (task_id, user_id, start_time)
    VALUES (?, ?, NOW())
  `;

  db.query(sql, [taskId, user_id], (err) => {
    if (err) {
      console.error("שגיאה בהתחלה:", err);
      return res.status(500).json({ message: "שגיאה" });
    }

    // מעדכן גם סטטוס משימה
    db.query(
      `UPDATE tasks SET status='בטיפול' WHERE task_id=?`,
      [taskId]
    );

    res.json({ message: "התחיל" });
  });
});

/**
 * =========================================
 * PUT
 * סיום משימה
 *  רק שומר סטטוס המשימה קבוציעה ושומר זמן סיום משימה בדיווח על ביצוע משימה ובודק אם המשימה בוצעה מתוך דווח קיים אם כן מדדכן סטטוס הדיווח לטופל
 * =========================================
 */
router.put("/end/:taskId", (req, res) => {
  const { taskId } = req.params;
  const { user_id } = req.body;

  // 1. סיום ביצוע משימה
  const endExecutionSql = `
    UPDATE task_executions
    SET end_time = NOW()
    WHERE task_id = ? AND user_id = ? AND end_time IS NULL
  `;

  db.query(endExecutionSql, [taskId, user_id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "שגיאה בסיום" });
    }

    // 2. עדכון סטטוס משימה
    const updateTaskSql = `
      UPDATE tasks 
      SET status='בוצעה' 
      WHERE task_id=?
    `;

    db.query(updateTaskSql, [taskId], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "שגיאה בעדכון משימה" });
      }

      // 3. בדיקה אם יש report_id
      const getReportSql = `
        SELECT report_id FROM tasks WHERE task_id = ?
      `;

      db.query(getReportSql, [taskId], (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "שגיאה בבדיקת דוח" });
        }

        const reportId = results[0]?.report_id;

        // 4. אם המשימה נוצרה מדוח → עדכון דוח
        if (reportId) {
          const updateReportSql = `
            UPDATE reports 
            SET status='טופל' 
            WHERE report_id = ?
          `;

          db.query(updateReportSql, [reportId], (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: "שגיאה בעדכון דוח" });
            }

            return res.json({ message: "המשימה והדוח עודכנו" });
          });
        } else {
          // אין דוח
          return res.json({ message: "המשימה הסתיימה" });
        }
      });
    });
  });
});


module.exports = router;
