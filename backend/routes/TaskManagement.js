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
