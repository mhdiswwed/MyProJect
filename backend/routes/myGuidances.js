/**
 * =========================================================
 * myGuidances.routes.js
 * ---------------------------------------------------------
 * ראוטר צד שרת עבור קומפוננטת "ההדרכות שלי" (MyGuidances)
 *
 *  שייך למדריכים (Guide)
 *
 * מה עושה:
 * - שליפת הדרכות של מדריך
 * - התחלת טיול
 * - סיום טיול
 *
 * טבלאות:
 * groups, guidances, trails, trip_requests
 *
 *  API:
 * GET    /api/myGuidances/:guideId
 * PUT    /api/myGuidances/start/:groupId
 * PUT    /api/myGuidances/end/:groupId
 * =========================================================
 */

const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

// ==============================
// multer לתמונות הדרכה
// ==============================
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/guidances/"); // 👈 תיקייה חדשה
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("רק תמונות מותרות"), false);
    }
  },
});

/**
 * ============================================
 * שליפת כל ההדרכות של מדריך
 * ============================================
 */
router.get("/:guideId", (req, res) => {
  const { guideId } = req.params;

  const sql = `
    SELECT 
    g.group_id,
    g.trip_date,
    g.trip_time,
    g.meeting_point,

    t.trail_name,
    t.trail_type,
    t.duration_minutes,
    t.description,
    t.difficulty_level,

    tr.number_of_participants,
    tr.number_of_vehicles,

    -- 👇 פרטי נציג קבוצה (חדש)
    u.full_name AS user_name,
    u.phone AS user_phone,
    u.email AS user_email,

    gu.status AS guidance_status,
    gu.start_time,
    gu.end_time,
    gu.notes,
    gu.images


  FROM groups g

  JOIN trails t ON g.trail_id = t.trail_id
  JOIN trip_requests tr ON g.request_id = tr.request_id
  JOIN guidances gu ON g.group_id = gu.group_id

  -- 👇 זה הכי חשוב!
  JOIN users u ON tr.user_id = u.user_id

  WHERE g.guide_id = ?

ORDER BY
  CASE gu.status
    WHEN 'בתהליך' THEN 1
    WHEN 'מתוכנן' THEN 2
    WHEN 'הסתיים' THEN 3
    WHEN 'בוטל' THEN 4
  END,
  g.trip_date ASC,
  g.trip_time ASC
  `;

  db.query(sql, [guideId], (err, rows) => {
    if (err) {
      console.error("❌ שגיאה בשליפת הדרכות:", err);
      return res.status(500).json({ error: "שגיאה בשרת" });
    }

    res.json(rows);
  });
});

/**
 * ============================================
 * התחלת טיול
 * ============================================
 */
router.put("/start/:groupId", (req, res) => {
  const { groupId } = req.params;

  const sql = `
    UPDATE guidances
    SET 
      status = 'בתהליך',
      start_time = NOW()
    WHERE group_id = ?
  `;

  db.query(sql, [groupId], (err) => {
    if (err) {
      console.error("❌ שגיאה בהתחלת טיול:", err);
      return res.status(500).json({ error: "שגיאה בהתחלה" });
    }

    res.json({ message: "טיול התחיל בהצלחה" });
  });
});

/**
 * ============================================
 * סיום טיול
 * ============================================
 */
router.put("/end/:groupId", (req, res) => {
  const { groupId } = req.params;

  const sql1 = `
    UPDATE guidances
    SET 
      status = 'הסתיים',
      end_time = NOW()
    WHERE group_id = ?
  `;

  const sql2 = `
    UPDATE groups
    SET status = 'הסתיים'
    WHERE group_id = ?
  `;

  db.query(sql1, [groupId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "שגיאה בסיום" });
    }

    db.query(sql2, [groupId], (err2) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ error: "שגיאה בעדכון קבוצה" });
      }

      res.json({ message: "טיול הסתיים בהצלחה" });
    });
  });
});

/* ============================================
 * שליחת דיווח על הטיול (תמונה + הערות)
 * ============================================
 */
router.post(
  "/report",
  upload.single("image"), // 👈🔥 זה מה שחסר לך
  async (req, res) => {
    try {
      const { group_id, notes } = req.body;

      const image = req.file ? req.file.filename : null;
      

      db.query(
        `
        UPDATE guidances
        SET
          notes = ?,
          images = ?
        WHERE group_id = ?
        `,
        [notes, image, group_id],
        (err) => {
          if (err) {
            console.error("❌ שגיאה בדיווח:", err);
            return res.status(500).json({ message: "שגיאה בשרת" });
          }

          res.json({ message: "הדיווח נשמר בהצלחה" });
        },
      );
    } catch (err) {
      console.error("❌ שגיאה כללית:", err);
      res.status(500).json({ message: "שגיאה בשרת" });
    }
  },
);

module.exports = router;
