//========================
//רוותיר לניהול הדיווחים של המשתמש
//========================

const express = require("express");
const router = express.Router();

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

/*
מחזיר את הדיווחים של המשתמש
*/
router.get("/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
  SELECT 
    report_id,
    problem_type,
    description,
    image_path,
    report_time,
    status
  FROM reports
  WHERE user_id = ?
  ORDER BY report_time DESC
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }

    res.json(result);
  });
});

/**
 * DELETE
 * ביטול דיווח
 */

router.delete("/cancelReport/:reportId", (req, res) => {
  const reportId = req.params.reportId;

  const sql = `
  DELETE FROM reports
  WHERE report_id = ?
  `;

  db.query(sql, [reportId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }

    res.json({
      message: "הדיווח בוטל בהצלחה",
    });
  });
});

module.exports = router;
