/*//==================================
ManagementTrails.js
ראוטר לניהול מסלולים – הוספה, עדכון, מחיקה ושליפה של מסלולים כולל העלאת קבצי תמונה וקובץ עקיבה בדיקות תקינות ומניעת כפילויות
//===================================*/

const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
//routes/user.js
const dbSingleton = require("../dbSingleton");

// Execute a query to the database
const db = dbSingleton.getConnection();
/* =========================
   Multer config
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "image") cb(null, "uploads/images");
    if (file.fieldname === "gpx_file") cb(null, "uploads/gpx");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

//=======================
//שליפת המע''מ
//=======================
router.get("/vat", (req, res) => {
  db.query(
    "SELECT setting_value FROM system_settings WHERE setting_name='vat'",
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "שגיאה במסד הנתונים" });
      }

      if (!rows.length) {
        return res.status(404).json({ message: "לא נמצא ערך מע״מ" });
      }

      res.json({ vat: Number(rows[0].setting_value) });
    },
  );
});

/* =========================
   GET – כל המסלולים
   ממוין לפי אורך המסלול
========================= */
router.get("/", (req, res) => {
  db.query("SELECT * FROM trails ORDER BY length_km ASC", (err, rows) => {
    if (err) return res.status(500).json({ error: "שגיאת שרת" });
    res.json(rows);
  });
});

/* =========================
   POST – הוספת מסלול
========================= */
router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gpx_file", maxCount: 1 },
  ]),
  (req, res) => {
    // קבלת הנתונים מהטופס
    const {
      trail_name,
      trail_type,
      difficulty_level,
      length_km,
      duration_minutes,
      start_point,
      end_point,
      price_per_person,
      price_per_vehicle,
      description,
    } = req.body;

    const image = req.files?.image?.[0];
    const gpx = req.files?.gpx_file?.[0];

    /* =========================
       1. שדות חובה
    ========================= */
    if (
      !trail_name ||
      !trail_type ||
      !difficulty_level ||
      !length_km ||
      duration_minutes === undefined ||
      !start_point ||
      !end_point ||
      !price_per_person ||
      !description
    ) {
      return res.status(400).json({ error: "חובה למלא את כל השדות" });
    }

    let errors = [];
    /* =========================
   2. בדיקות מספרים
========================= */
    if (isNaN(length_km) || Number(length_km) <= 0) {
      errors.push("אורך מסלול לא תקין");
    }

    if (isNaN(price_per_person) || Number(price_per_person) < 0) {
      errors.push("מחיר לאדם לא תקין");
    }
    // בדיקת זמן המסלול
    const duration = Number(duration_minutes);

    if (isNaN(duration)) {
      errors.push("משך זמן המסלול חייב להיות מספר");
    } else if (duration <= 0) {
      errors.push("משך זמן המסלול חייב להיות גדול מ-0");
    } else if (duration > 600) {
      errors.push("משך זמן המסלול לא יכול לעלות על 10 שעות (600 דקות)");
    }
    if (trail_type !== "רגלי") {
      if (!price_per_vehicle) {
        errors.push("חובה להזין מחיר לכלי במסלול שאינו רגלי");
      } else if (isNaN(price_per_vehicle) || Number(price_per_vehicle) < 0) {
        errors.push("מחיר לכלי לא תקין");
      }
    }

    /* =========================
   3. קבצים חובה וגם סוג הקובץ
========================= */
    if (!image) {
      errors.push("חובה להעלות תמונה");
    } else if (!image.mimetype.startsWith("image/")) {
      errors.push("קובץ התמונה חייב להיות תמונה");
    }

    if (!gpx) {
      errors.push("חובה להעלות קובץ GPX");
    } else if (
      gpx.mimetype !== "application/gpx+xml" &&
      gpx.mimetype !== "application/octet-stream"
    ) {
      errors.push("קובץ GPX לא תקין");
    }

    /* =========================
   החזרת שגיאות אם קיימות
========================= */
    if (errors.length > 0) {
      return res.status(400).json({
        error: errors.join(" וגם "),
      });
    }

    /* =========================
   4. בדיקת כפילות
========================= */
    const dupQuery = `
  SELECT trail_id
  FROM trails
  WHERE trail_name = ?
    AND start_point = ?
    AND end_point = ?
    AND trail_type = ?
  LIMIT 1
`;

    const dupValues = [
      trail_name.trim(),
      start_point.trim(),
      end_point.trim(),
      trail_type,
    ];

    db.query(dupQuery, dupValues, (err, rows) => {
      if (err) {
        console.error("DB ERROR (dup check):", err);
        return res.status(500).json({ error: "שגיאת שרת (DB)" });
      }

      if (rows.length > 0) {
        return res
          .status(409)
          .json({ error: "❌ המסלול כבר קיים במערכת (כפילות)" });
      }

      /* =========================
       4. INSERT (כמו בספר)
    ========================= */
      const query = `
      INSERT INTO trails
(trail_name, trail_type, difficulty_level, length_km, duration_minutes,
 start_point, end_point, price_per_person, price_per_vehicle,
 description, images, gpx_file)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
    `;

      const values = [
        trail_name.trim(),
        trail_type,
        difficulty_level,
        length_km,
        duration_minutes,
        start_point.trim(),
        end_point.trim(),
        price_per_person,
        trail_type === "רגלי" ? null : price_per_vehicle,
        description.trim(),
        image.filename,
        gpx.filename,
      ];

      //console.log("INSERT DATA:", values);

      db.query(query, values, (err, result) => {
        if (err) {
          console.error("DB ERROR:", err);
          return res.status(500).json({ error: "שגיאת שרת (DB)" });
        }

        res.json({
          success: true,
          message: "המסלול נוסף בהצלחה ",
          id: result.insertId,
        });
      });
    });
  },
);

//===========================
//מחיקת מסלול מסוים
//===============================
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "ID לא תקין" });
  }

  // 1. בדיקה אם המסלול קיים
  const checkTrailQuery = "SELECT trail_id FROM trails WHERE trail_id = ?";

  db.query(checkTrailQuery, [id], (err, trails) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "שגיאת שרת" });
    }

    if (trails.length === 0) {
      return res.status(404).json({ error: "המסלול לא נמצא" });
    }

    // 2. בדיקה אם יש בקשות למסלול
    const checkRequestsQuery =
      "SELECT COUNT(*) AS count FROM trip_requests WHERE trail_id = ?";

    db.query(checkRequestsQuery, [id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "שגיאת שרת" });
      }

      if (result[0].count > 0) {
        return res.status(409).json({
          error:
            "לא ניתן למחוק את המסלול כי קיימות בקשות פתוחות ליציאה לטיול במסלול זה",
        });
      }

      // 3. אם אין בקשות – מוחקים
      const deleteQuery = "DELETE FROM trails WHERE trail_id = ?";

      db.query(deleteQuery, [id], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "שגיאה במחיקה" });
        }

        res.json({ message: "המסלול נמחק בהצלחה ✅" });
      });
    });
  });
});

/* =========================
   עדכון מסלול לפי ID
========================= */
router.put(
  "/:id",
  upload.fields([
    { name: "gpx_file", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  (req, res) => {
    const { id } = req.params;

    const {
      trail_name,
      trail_type,
      difficulty_level,
      length_km,
      duration_minutes,
      start_point,
      end_point,
      price_per_person,
      price_per_vehicle,
      description,
    } = req.body;

    /* =========================
        ניקוי משתנים (חשוב מאוד!)
       כדי למנוע כפילויות שגויות
    ========================= */
    const cleanName = trail_name?.trim();
    const cleanStart = start_point?.trim();
    const cleanEnd = end_point?.trim();
    const cleanType = trail_type?.trim();
    const cleanDesc = description?.trim();

    /* =========================
       1. בדיקה שכל השדות קיימים
    ========================= */
    if (
      !cleanName ||
      !cleanType ||
      !difficulty_level ||
      !length_km ||
      duration_minutes === undefined ||
      !cleanStart ||
      !cleanEnd ||
      !price_per_person ||
      !cleanDesc
    ) {
      return res.status(400).json({
        error: "❌ חובה למלא את כל השדות לפני עדכון המסלול",
      });
    }

    let errors = [];

    /* =========================
   2. בדיקות מספרים (לעדכון)
========================= */
    // בדיקת זמן המסלול
if (duration_minutes !== undefined) {
  const duration = Number(duration_minutes);

  if (isNaN(duration)) {
    errors.push("משך זמן המסלול חייב להיות מספר");
  } else if (duration <= 0) {
    errors.push("משך זמן המסלול חייב להיות גדול מ-0");
  } else if (duration > 600) {
    errors.push("משך זמן המסלול לא יכול לעלות על 10 שעות (600 דקות)");
  }
}
    // בודקים רק אם השדה נשלח
    if (length_km !== undefined) {
      if (isNaN(length_km) || Number(length_km) < 0) {
        errors.push("אורך מסלול לא תקין");
      }
    }

    if (price_per_person !== undefined) {
      if (isNaN(price_per_person) || Number(price_per_person) < 0) {
        errors.push("מחיר לאדם לא תקין");
      }
    }

    // אם סוג המסלול לא רגלי אז צריך מחיר לכלי
    if (cleanType !== "רגלי") {
      if (price_per_vehicle === undefined || price_per_vehicle === "") {
        errors.push("חובה להזין מחיר לכלי במסלול שאינו רגלי");
      } else if (isNaN(price_per_vehicle) || Number(price_per_vehicle) < 0) {
        errors.push("מחיר לכלי לא תקין");
      }
    }

    /* =========================
       3. בדיקה שהמסלול קיים
    ========================= */
    db.query(
      "SELECT trail_id FROM trails WHERE trail_id = ?",
      [id],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: "שגיאת שרת" });
        }

        if (rows.length === 0) {
          return res.status(404).json({ error: "המסלול לא נמצא" });
        }

        /* =========================
           4. בדיקת כפילות
           מותר אותו מסלול – אסור אותו מסלול + אותו סוג
        ========================= */
        const dupQuery = `
          SELECT trail_id
          FROM trails
          WHERE trail_name = ?
            AND start_point = ?
            AND end_point = ?
            AND trail_type = ?
            AND trail_id <> ?
        `;

        db.query(
          dupQuery,
          [cleanName, cleanStart, cleanEnd, cleanType, id],
          (err, rows) => {
            if (err) {
              console.error("DB ERROR (dup check):", err);
              return res.status(500).json({
                error: "שגיאת שרת בבדיקת כפילות",
              });
            }

            if (rows.length > 0) {
              return res.status(409).json({
                error: "❌ קיים כבר מסלול זהה עם אותו סוג",
              });
            }

            /* =========================
               5. קבצים (אם נשלחו)
            ========================= */
            const gpxFile = req.files?.gpx_file?.[0];
            const imageFile = req.files?.image?.[0];

            /* =========================
            3. קבצים חובה וגם סוג הקובץ
            ========================= */
            if (imageFile && !imageFile.mimetype.startsWith("image/")) {
              errors.push("קובץ התמונה חייב להיות תמונה");
            }

            if (gpxFile) {
              const ok =
                gpxFile.mimetype === "application/gpx+xml" ||
                gpxFile.mimetype === "application/octet-stream" ||
                gpxFile.mimetype === "text/xml" ||
                gpxFile.mimetype === "application/xml";

              if (!ok) {
                errors.push("קובץ GPX לא תקין");
              }
            }
            /* =========================
             החזרת שגיאות אם קיימות
            ========================= */
            if (errors.length > 0) {
              return res.status(400).json({
                error: errors.join(" וגם "),
              });
            }

            /* =========================
               6. בניית שאילתת UPDATE
            ========================= */
            let query = `
              UPDATE trails SET
                trail_name = ?,
                trail_type = ?,
                difficulty_level = ?,
                length_km = ?,
                duration_minutes = ?,
                start_point = ?,
                end_point = ?,
                price_per_person = ?,
                price_per_vehicle = ?,
                description = ?
            `;

            const values = [
              cleanName,
              cleanType,
              difficulty_level,
              length_km,
              duration_minutes,
              cleanStart,
              cleanEnd,
              price_per_person,
              cleanType === "רגלי" ? null : price_per_vehicle,
              cleanDesc,
            ];

            if (gpxFile) {
              query += ", gpx_file = ?";
              values.push(gpxFile.filename);
            }

            if (imageFile) {
              query += ", images = ?";
              values.push(imageFile.filename);
            }

            query += " WHERE trail_id = ?";
            values.push(id);

            /* =========================
               7. ביצוע עדכון
            ========================= */
            db.query(query, values, (err) => {
              if (err) {
                console.error(err);
                return res.status(500).json({
                  error: "שגיאה בעדכון מסלול",
                });
              }

              res.json({
                success: true,
                message: "המסלול עודכן בהצלחה ✅",
              });
            });
          },
        );
      },
    );
  },
);

//================================
// מחיקת כל המסלולים
//================================
router.delete("/", (req, res) => {
  const deleteQuery = "DELETE FROM trails";

  db.query(deleteQuery, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: "שגיאה במחיקת המסלולים",
      });
    }

    res.json({
      message: "כל המסלולים נמחקו בהצלחה ✅",
    });
  });
});
module.exports = router;
