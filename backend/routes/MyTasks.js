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
      t.due_time AS end_time ,
      t.description,
      t.image,

      tr.trail_name,

      tw.role

    FROM tasks t

    JOIN task_workers tw
      ON t.task_id = tw.task_id

    LEFT JOIN reports r
      ON t.report_id = r.report_id

    LEFT JOIN trails tr
      ON r.trail_id = tr.trail_id

    WHERE tw.user_id = ?

    ORDER BY
      CASE
        WHEN t.status = 'פתוחה' THEN 1
        WHEN t.status = 'בטיפול' THEN 2
        WHEN t.status = 'בוצעה' THEN 3
        WHEN t.status = 'בוטלה' THEN 4
      END,
      t.created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
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
router.put("/start/:taskId", (req, res) => {
  const { taskId } = req.params;

  const sql = `
    UPDATE tasks
    SET 
      status = 'בטיפול',
      start_time = NOW()
    WHERE task_id = ?
  `;

  db.query(sql, [taskId], (err) => {
    if (err) {
      console.error("שגיאה בהתחלת משימה:", err);
      return res.status(500).json({
        message: "שגיאה בהתחלת משימה",
      });
    }

    res.json({
      message: "המשימה התחילה",
    });
  });
});

/**
 * =========================================
 * PUT
 * סיום משימה (רק עדכון בסיסי)
 * =========================================
 */
router.put("/end/:taskId", (req, res) => {
  const { taskId } = req.params;

  const sql = `
    UPDATE tasks
    SET 
      status = 'בוצעה',
      end_time = NOW()
    WHERE task_id = ?
  `;

  db.query(sql, [taskId], (err) => {
    if (err) {
      console.error("שגיאה בסיום משימה:", err);
      return res.status(500).json({
        message: "שגיאה בסיום משימה",
      });
    }

    res.json({
      message: "המשימה הסתיימה",
    });
  });
});

module.exports = router;
