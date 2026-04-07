/**
 * =========================================
 * ראוטר: ניהול משימות (צד מנהל)
 * =========================================
 */

const express = require("express");
const router = express.Router();

// חיבור למסד נתונים
const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

/**
 * =========================================
 * GET
 * שליפת כל המשימות
 * =========================================
 */
router.get("/", (req, res) => {
  const sql = `
   /**
 * שליפת כל נתוני המשימות לניהול
 */
SELECT
  t.*,
  
  -- שם מסלול
  tr.trail_name,

  -- מיקום (אם יש)
  r.latitude,
  r.longitude,


  -- קובץ GPX
  tr.gpx_file

FROM tasks t

LEFT JOIN reports r
  ON t.report_id = r.report_id

LEFT JOIN trails tr
  ON tr.trail_id = COALESCE(r.trail_id, t.trail_id)

ORDER BY
  CASE
    WHEN t.status = 'בטיפול' THEN 1
    WHEN t.status = 'פתוחה' THEN 2
    WHEN t.status = 'בוצעה' THEN 3
    WHEN t.status = 'בוטלה' THEN 4
  END,

  CASE 
    WHEN t.status = 'בטיפול' THEN t.start_time
  END ASC,

  CASE 
    WHEN t.status = 'פתוחה' THEN t.due_time
  END ASC,

  CASE 
    WHEN t.status = 'בוצעה' THEN t.due_time
  END DESC,

  t.created_at DESC
  `;

  db.query(sql, (err, results) => {
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
 * GET עובדים לפי משימה
 * =========================================
 */
router.get("/:taskId/workers", (req, res) => {
  const { taskId } = req.params;

  const sql = `
    SELECT
      u.user_id,
      u.full_name,
      u.phone,
      u.email,
      tw.role
    FROM task_workers tw
    JOIN users u ON u.user_id = tw.user_id
    WHERE tw.task_id = ?
  `;

  db.query(sql, [taskId], (err, results) => {
    if (err) {
      console.error("שגיאה בשליפת עובדים:", err);
      return res.status(500).json({ message: "שגיאה" });
    }

    res.json(results);
  });
});

/**
 * =========================================
 * GET
 * שליפת ביצועי משימה (בקרה)
 * =========================================
 */
router.get("/:taskId/executions", (req, res) => {
  const { taskId } = req.params;

  const sql = `
    SELECT
      te.execution_id,

      -- פרטי עובד
      u.user_id,
      u.full_name,
      u.phone,
      u.email,

      -- תפקיד במשימה
      tw.role,

      -- זמני ביצוע בפועל
      te.start_time,
      te.end_time,

      -- הערות + תמונה
      te.note,
      te.image

    FROM task_executions te

    -- חיבור לעובד
    JOIN users u
      ON u.user_id = te.user_id

    -- חיבור לתפקיד העובד במשימה
    LEFT JOIN task_workers tw
      ON tw.task_id = te.task_id
      AND tw.user_id = te.user_id

    WHERE te.task_id = ?
  `;

  db.query(sql, [taskId], (err, results) => {
    if (err) {
      console.error("שגיאה בשליפת ביצועים:", err);
      return res.status(500).json({
        message: "שגיאה בשליפת ביצועים",
      });
    }

    res.json(results);
  });
});


/**
 * =========================================
 * PUT
 * ביטול משימה + שמירת סיבה
 * =========================================
 */
router.put("/cancel/:taskId", (req, res) => {
  const { taskId } = req.params;
  const { reason } = req.body;

  const sql = `
    UPDATE tasks
    SET status = 'בוטלה',
        cancel_reason = ?
    WHERE task_id = ?
  `;

  db.query(sql, [reason, taskId], (err) => {
    if (err) {
      console.error("שגיאה בביטול:", err);
      return res.status(500).json({ message: "שגיאה" });
    }

    res.json({ message: "המשימה בוטלה" });
  });
});


/**
 * =========================================
 * POST
 * יצירת משימה חדשה
 * =========================================
 */
router.post("/", (req, res) => {
  const { task_type, trail_id, start_time, due_time, description } = req.body;

  const sql = `
    INSERT INTO tasks
(task_type, trail_id, start_time, due_time, description, status)
VALUES (?, ?, ?, ?, ?, 'פתוחה')
  `;

  db.query(
    sql,
    [task_type, trail_id, start_time, due_time, description],
    (err, result) => {
      if (err) {
        console.error("שגיאה ביצירת משימה:", err);
        return res.status(500).json({
          message: "שגיאה ביצירת משימה",
        });
      }

      res.json({
        message: "משימה נוצרה בהצלחה",
        task_id: result.insertId,
      });
    },
  );
});

/**
 * =========================================
 * PUT
 * עדכון סטטוס משימה
 * =========================================
 */
router.put("/status/:taskId", (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  const sql = `
    UPDATE tasks
    SET status = ?
    WHERE task_id = ?
  `;

  db.query(sql, [status, taskId], (err) => {
    if (err) {
      console.error("שגיאה בעדכון סטטוס:", err);
      return res.status(500).json({
        message: "שגיאה בעדכון סטטוס",
      });
    }

    res.json({
      message: "סטטוס עודכן",
    });
  });
});

/**
 * =========================================
 * DELETE
 * מחיקת משימה
 * =========================================
 */
router.delete("/:taskId", (req, res) => {
  const { taskId } = req.params;

  const sql = `
    DELETE FROM tasks
    WHERE task_id = ?
  `;

  db.query(sql, [taskId], (err) => {
    if (err) {
      console.error("שגיאה במחיקה:", err);
      return res.status(500).json({
        message: "שגיאה במחיקה",
      });
    }

    res.json({
      message: "משימה נמחקה",
    });
  });
});

module.exports = router;
