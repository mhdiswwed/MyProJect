//===================================
//FieldReports.js
// ראוטר לדיווחים מהשטח
//====================================

const express = require("express");
const router = express.Router();

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

/**
 * =========================================
 * GET
 * שליפת כל הדיווחים
 * =========================================
 */
router.get("/", (req, res) => {
  const sql = `
    SELECT
      r.report_id,
      r.problem_type,
      r.description,
      r.image_path,
      r.latitude,
      r.longitude,
      r.report_time,
      r.status,

      u.full_name AS reporter_name,
      u.phone,
      u.email,

      t.trail_name,
      t.gpx_file

    FROM reports r

    JOIN users u
      ON r.user_id = u.user_id

    JOIN trails t
      ON r.trail_id = t.trail_id

    ORDER BY
      CASE
        WHEN r.status = 'חדש' THEN 1
        WHEN r.status = 'בטיפול' THEN 2
        WHEN r.status = 'טופל' THEN 3
        ELSE 4
      END,
      r.report_time DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("שגיאה בשליפת דיווחים:", err);
      return res.status(500).json({
        message: "שגיאה בשליפת דיווחים",
      });
    }

    res.json(results);
  });
});

/**
 * =========================================
 * PUT
 * מעבר לסטטוס "בטיפול"
 * =========================================
 */
router.put("/inProgress/:reportId", (req, res) => {
  const { reportId } = req.params;

  const sql = `
    UPDATE reports
    SET status = 'בטיפול'
    WHERE report_id = ?
  `;

  db.query(sql, [reportId], (err) => {
    if (err) {
      console.error("שגיאה בעדכון סטטוס:", err);
      return res.status(500).json({
        message: "שגיאה בעדכון סטטוס",
      });
    }

    res.json({
      message: "הדיווח הועבר לטיפול",
    });
  });
});

/**
 * =========================================
 * PUT
 * סימון דיווח כ"טופל"
 * =========================================
 */
router.put("/done/:reportId", (req, res) => {
  const { reportId } = req.params;

  const sql = `
    UPDATE reports
    SET status = 'טופל'
    WHERE report_id = ?
  `;

  db.query(sql, [reportId], (err) => {
    if (err) {
      console.error("שגיאה בעדכון סטטוס:", err);
      return res.status(500).json({
        message: "שגיאה בעדכון סטטוס",
      });
    }

    res.json({
      message: "הדיווח סומן כטופל",
    });
  });
});

module.exports = router;
