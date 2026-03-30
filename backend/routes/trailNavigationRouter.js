//===========================
//רוותיר לניהול ניווט שטח בזמן אמת + דיווח בעיה
//============================


const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

const multer = require("multer");
const path = require("path");

/* ==============================
   Multer – שמירת תמונות
============================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/reports/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/* ==============================
   GET מסלול לניווט
============================== */
router.get("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "SELECT * FROM trails WHERE trail_id = ?";

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    if (!results.length) {
      return res.status(404).json({ message: "המסלול לא נמצא" });
    }

    res.json(results[0]);
  });
});

/* ==============================
   POST דיווח מהשטח (תמונה חובה)
============================== */
router.post("/:id/report", upload.single("image"), (req, res) => {
  const { id } = req.params;

  const { user_id, latitude, longitude, problem_type, description } = req.body;

  const errors = [];

  // התחברות
  if (!user_id) errors.push("צריך להתחבר");

  // GPS חובה + מספרים תקינים
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!latitude || !longitude) {
    errors.push("חסר מיקום GPS");
  } else if (Number.isNaN(lat) || Number.isNaN(lng)) {
    errors.push("מיקום GPS לא תקין");
  }

  // שדות חובה
  if (!problem_type) errors.push("חובה לבחור סוג בעיה");
  if (!description) errors.push("חובה להזין תיאור");

  // תמונה חובה לפי הדרישות
  if (!req.file) errors.push("חובה לצרף תמונה");

  if (errors.length > 0) {
    return res.status(400).json({
      message: errors.join(" וגם "),
    });
  }

  // בדיקה שהמסלול קיים לפני שמירת דיווח
  const checkTrailSql = "SELECT trail_id FROM trails WHERE trail_id = ?";

  db.query(checkTrailSql, [id], (err, trailResults) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    if (!trailResults.length) {
      return res.status(404).json({ message: "המסלול לא נמצא" });
    }

    const imagePath = `uploads/reports/${req.file.filename}`;

    const insertSql = `
      INSERT INTO reports
      (user_id, trail_id, latitude, longitude, problem_type, description, image_path, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'חדש')
    `;

    db.query(
      insertSql,
      [user_id, id, lat, lng, problem_type, description, imagePath],
      (err2) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ message: "שגיאת שרת" });
        }

        res.json({ message: "הדיווח נשלח בהצלחה" });
      },
    );
  });
});

module.exports = router;
