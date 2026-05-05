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

// ממיר ערך למספר אם אפשר
function parseValue(value) {
  const num = Number(value);
  return !isNaN(num) ? num : value;
}

// בודק אם ערך ריק או לא תקין
function isInvalidBasicValue(name, value) {
  const num = Number(value);

  return (
    value === "" ||
    (isNaN(num) &&
      name !== "working_hours_start" &&
      name !== "working_hours_end")
  );
}

// בודק הגבלות לפי סוג הגדרה
function validateByName(name, num) {
  if (name === "vat" && (num < 0 || num > 100)) {
    return "מע״מ חייב להיות בין 0 ל-100";
  }

  if (name === "max_reports_per_route" && num < 0) {
    return "כמות דיווחים לא יכולה להיות שלילית";
  }

  if (name === "report_interval_minutes" && num < 0) {
    return "זמן לא יכול להיות שלילי";
  }

  if (name === "min_participants" && num < 0) {
    return "מינימום משתתפים לא יכול להיות שלילי";
  }

  if (name === "max_participants" && num < 0) {
    return "מקסימום משתתפים לא יכול להיות שלילי";
  }

  
if (
  (name === "guide_break_minutes" || name === "worker_break_minutes") &&
  (!Number.isFinite(num) || num < 0)
) {
  return "זמן הפסקה לא יכול להיות שלילי";
}

  return null;
}

// בודק פורמט שעה
function isValidTimeFormat(name, value) {
  if (name !== "working_hours_start" && name !== "working_hours_end") {
    return true;
  }

  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(value);
}

// מעדכן הגדרה במסד
function updateSetting(name, value, callback) {
  db.query(
    "UPDATE system_settings SET setting_value=? WHERE setting_name=?",
    [value, name],
    callback
  );
}



// עדכון הגדרה לפי שם
router.put("/:name", (req, res) => {
  const { name } = req.params;
  const { value } = req.body;

  const finalValue = parseValue(value);
  const num = Number(value);

  if (isInvalidBasicValue(name, value)) {
    return res.status(400).json({ message: "ערך לא תקין" });
  }

  const error = validateByName(name, num);
  if (error) {
    return res.status(400).json({ message: error });
  }

  if (!isValidTimeFormat(name, value)) {
    return res.status(400).json({
      message: "פורמט שעה לא תקין (HH:MM)",
    });
  }

  updateSetting(name, finalValue, (err) => {
    if (err) {
      return res.status(500).json({ message: "שגיאה בעדכון" });
    }

    res.json({ message: "עודכן בהצלחה" });
  });
});

module.exports = router;
