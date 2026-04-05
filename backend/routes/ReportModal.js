//===================================
//  ראוטר: חלון פופה של דיווח משימה לעובד שטח
//===================================

const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

/**
 * הגדרת אחסון תמונות
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { task_id, user_id } = req.body;

    // יצירת נתיב לפי משימה + עובד
    const dir = path.join(
      __dirname,
      "../uploads/reports",
      `${task_id}_${user_id}`,
    );

    // יצירת תיקייה אם לא קיימת
    fs.mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },

  filename: function (req, file, cb) {
    // שם קובץ לפי זמן
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/**
 * =========================================
 * POST
 * שליחת דיווח
 * =========================================
 */
router.post("/report", upload.single("image"), (req, res) => {
  const { note, task_id, user_id } = req.body; // מקבל נתונים מהלקוח

  // בניית נתיב תמונה אם קיימת
  const imagePath = req.file
    ? `/uploads/reports/${task_id}_${user_id}/${req.file.filename}`
    : null;

  // עדכון הרשומה הקיימת של הביצוע
  const sql = `
    UPDATE task_executions
    SET note = ?, image = ?
    WHERE task_id = ? AND user_id = ?
    ORDER BY start_time DESC
    LIMIT 1
  `;

  db.query(sql, [note, imagePath, task_id, user_id], (err) => {
    if (err) {
      console.error(err); // הדפסת שגיאה לשרת
      return res.status(500).json({ message: "שגיאה בשמירה" });
    }

    res.json({ message: "דיווח נשמר בהצלחה" }); // הצלחה
  });
});

module.exports = router;
