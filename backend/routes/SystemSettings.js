//=======================
//רוותיר  לניהול הגדרות מערכת
//=======================

const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

//שליפת  כל ההגדרות
router.get("/", (req, res) => {
  db.query(
    "SELECT setting_name, setting_value FROM system_settings",
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "שגיאה במסד הנתונים" });
      }

      const settings = {};

      rows.forEach((row) => {
        settings[row.setting_name] = Number(row.setting_value);
      });

      res.json(settings);
    },
  );
});

//עדכון 'ההגדרות לפי סוג שנשלח לעדכון
router.put("/:name", (req, res) => {
  const { name } = req.params;
  const { value } = req.body;

  const num = Number(value);

  // בדיקה אם ערך לא תקין
  if (value === "" || isNaN(num)) {
    return res.status(400).json({ message: "ערך לא תקין" });
  }

  // מע״מ
  if (name === "vat" && (num < 0 || num > 100)) {
    return res.status(400).json({
      message: "מע״מ חייב להיות בין 0 ל-100",
    });
  }

  // כמות דיווחים
  if (name === "max_reports_per_route" && num < 0) {
    return res.status(400).json({
      message: "כמות דיווחים לא יכולה להיות שלילית",
    });
  }

  // זמן בין דיווחים
  if (name === "report_interval_minutes" && num < 0) {
    return res.status(400).json({
      message: "זמן לא יכול להיות שלילי",
    });
  }

  // מינימום משתתפים
  if (name === "min_participants" && num < 0) {
    return res.status(400).json({
      message: "מינימום משתתפים לא יכול להיות שלילי",
    });
  }

  // מקסימום משתתפים
  if (name === "max_participants" && num < 0) {
    return res.status(400).json({
      message: "מקסימום משתתפים לא יכול להיות שלילי",
    });
  }
  
  db.query(
    "UPDATE system_settings SET setting_value=? WHERE setting_name=?",
    [num, name],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "שגיאה בעדכון" });
      }

      res.json({ message: "עודכן בהצלחה" });
    },
  );
});

module.exports = router;
