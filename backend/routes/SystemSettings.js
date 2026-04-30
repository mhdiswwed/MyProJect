/*//==================================================================
systemSettings.js
ראוטר לניהול הגדרות מערכת – מאפשר שליפת כל ההגדרות ועדכון ערכים שונים כמו מע״מ, שעות עבודה, מגבלות משתמשים וזמני הפסקות בצורה מבוקרת.
//===================================================================*/

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
        // אם זה מספר → המר למספר, אחרת השאר כטקסט (לשעות)
        const num = Number(row.setting_value);
        settings[row.setting_name] = isNaN(num) ? row.setting_value : num;
      });

      res.json(settings);
    },
  );
});

//עדכון 'ההגדרות לפי סוג שנשלח לעדכון
router.put("/:name", (req, res) => {
  const { name } = req.params;
  const { value } = req.body;

  // ניסיון להמיר למספר
  const num = Number(value);

  // ערך סופי שישמר (מספר או טקסט)
  let finalValue = value;

  // אם זה מספר תקין → נשמור כמספר
  if (!isNaN(num)) {
    finalValue = num;
  }

  // אם זה לא מספר וגם לא שעות → שגיאה
  if (
    value === "" ||
    (isNaN(num) &&
      name !== "working_hours_start" &&
      name !== "working_hours_end")
  ) {
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

  // הפסקת מדריך
  if (name === "guide_break_minutes" && num < 0) {
    return res.status(400).json({
      message: "זמן הפסקה למדריך לא יכול להיות שלילי",
    });
  }

  // הפסקת עובד
  if (name === "worker_break_minutes" && num < 0) {
    return res.status(400).json({
      message: "זמן הפסקה לעובד לא יכול להיות שלילי",
    });
  }

  // בדיקת שעות
  if (name === "working_hours_start" || name === "working_hours_end") {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!regex.test(value)) {
      return res.status(400).json({
        message: "פורמט שעה לא תקין (HH:MM)",
      });
    }
  }

  db.query(
    "UPDATE system_settings SET setting_value=? WHERE setting_name=?",
    [finalValue, name],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "שגיאה בעדכון" });
      }

      res.json({ message: "עודכן בהצלחה" });
    },
  );
});

module.exports = router;
