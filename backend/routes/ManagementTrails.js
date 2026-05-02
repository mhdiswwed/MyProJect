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
    const data = req.body;
    const image = req.files?.image?.[0];
    const gpx = req.files?.gpx_file?.[0];

    const requiredErrors = validateRequired(data);

    if (requiredErrors.length > 0) {
      return res.status(400).json({
        error: requiredErrors.join(" וגם "),
      });
    }

    validateData(data, image, gpx, res, (errors) => {
      if (errors.length > 0) {
        return res.status(400).json({
          error: errors.join(" וגם "),
        });
      }

      checkDuplicate(data, image, gpx, res);
    });
  },
);

/**
 * בדיקת שדות חובה (מחזיר מערך שגיאות)
 */
function validateRequired(data) {
  let errors = [];

  if (!data.trail_name) errors.push("חסר שם מסלול");
  if (!data.trail_type) errors.push("חסר סוג מסלול");
  if (!data.difficulty_level) errors.push("חסרה רמת קושי");
  if (!data.length_km) errors.push("חסר אורך מסלול");
  if (data.duration_minutes === undefined) errors.push("חסר משך זמן");
  if (!data.start_point) errors.push("חסרה נקודת התחלה");
  if (!data.end_point) errors.push("חסרה נקודת סיום");
  if (!data.price_per_person) errors.push("חסר מחיר לאדם");
  if (!data.description) errors.push("חסר תיאור");

  return errors;
}

/**
 * מקבלת: callback
 * עושה: מחשבת זמן פעילות בדקות לפי שעות התחלה וסיום
 * מחזירה: מספר דקות
 */
function getMaxActivityMinutes(callback) {
  const sql = `
    SELECT setting_name, setting_value
    FROM system_settings
    WHERE setting_name IN ('working_hours_start', 'working_hours_end')
  `;

  db.query(sql, (err, rows) => {
    if (err) return callback(err);

    let start = null;
    let end = null;

    rows.forEach((row) => {
      if (row.setting_name === "working_hours_start") {
        start = row.setting_value;
      }
      if (row.setting_name === "working_hours_end") {
        end = row.setting_value;
      }
    });

    if (!start || !end) {
      return callback(new Error("שעות פעילות לא מוגדרות"));
    }

    const [sh, sm] = start.split(":");
    const [eh, em] = end.split(":");

    const startMinutes = Number(sh) * 60 + Number(sm);
    const endMinutes = Number(eh) * 60 + Number(em);

    const totalMinutes = endMinutes - startMinutes;

    callback(null, totalMinutes);
  });
}

/**
 * בדיקות תקינות נתונים וקבצים (כולל בדיקת שעות פעילות)
 */
function validateData(data, image, gpx, res, callback) {
  let errors = [];

  if (isNaN(data.length_km) || Number(data.length_km) <= 0) {
    errors.push("אורך מסלול לא תקין");
  }

  if (isNaN(data.price_per_person) || Number(data.price_per_person) < 0) {
    errors.push("מחיר לאדם לא תקין");
  }

  const duration = Number(data.duration_minutes);

  if (isNaN(duration)) {
    errors.push("משך זמן המסלול חייב להיות מספר");
  } else if (duration <= 0) {
    errors.push("משך זמן המסלול חייב להיות גדול מ-0");
  }

  if (data.trail_type !== "רגלי") {
    if (!data.price_per_vehicle) {
      errors.push("חובה להזין מחיר לכלי");
    } else if (
      isNaN(data.price_per_vehicle) ||
      Number(data.price_per_vehicle) < 0
    ) {
      errors.push("מחיר לכלי לא תקין");
    }
  }

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

  getMaxActivityMinutes((err, maxMinutes) => {
    if (err) {
      return res.status(500).json({ error: "שגיאה במסד הנתונים" });
    }
    const hours = Math.floor(maxMinutes / 60);
    const minutes = maxMinutes % 60;

    if (duration > maxMinutes) {
      errors.push(
        `משך זמן המסלול לא יכול לעלות על ${hours} שעות ו-${minutes} דקות`,
      );
    }

    callback(errors);
  });
}
/**
 * בדיקת כפילות במסד
 */
function checkDuplicate(data, image, gpx, res) {
  const sql = `
    SELECT trail_id
    FROM trails
    WHERE trail_name = ?
      AND start_point = ?
      AND end_point = ?
      AND trail_type = ?
    LIMIT 1
  `;

  const values = [
    data.trail_name.trim(),
    data.start_point.trim(),
    data.end_point.trim(),
    data.trail_type,
  ];

  db.query(sql, values, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "שגיאה במסד הנתונים" });
    }

    if (rows.length > 0) {
      return res.status(409).json({ error: "המסלול כבר קיים" });
    }

    insertTrail(data, image, gpx, res);
  });
}

/**
 * הכנסת מסלול למסד
 */
function insertTrail(data, image, gpx, res) {
  const sql = `
    INSERT INTO trails
    (trail_name, trail_type, difficulty_level, length_km, duration_minutes,
     start_point, end_point, price_per_person, price_per_vehicle,
     description, images, gpx_file)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    data.trail_name.trim(),
    data.trail_type,
    data.difficulty_level,
    data.length_km,
    data.duration_minutes,
    data.start_point.trim(),
    data.end_point.trim(),
    data.price_per_person,
    data.trail_type === "רגלי" ? null : data.price_per_vehicle,
    data.description.trim(),
    image.filename,
    gpx.filename,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "שגיאה במסד הנתונים" });
    }

    res.json({
      success: true,
      message: "המסלול נוסף בהצלחה",
      id: result.insertId,
    });
  });
}

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

        res.json({ message: "המסלול נמחק בהצלחה " });
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
    const data = req.body;

    const cleaned = cleanData(data);

    const requiredErrors = validateRequiredUpdate(cleaned, data);

    if (requiredErrors.length > 0) {
      return res.status(400).json({
        error: requiredErrors.join(" וגם "),
      });
    }

    validateNumbersUpdate(cleaned, data, res, (errors) => {
      if (errors.length > 0) {
        return res.status(400).json({
          error: errors.join(" וגם "),
        });
      }

      checkTrailExists(id, res, () => {
        checkDuplicateTrail(cleaned, id, res, () => {
          validateFiles(req, errors);

          if (errors.length > 0) {
            return res.status(400).json({
              error: errors.join(" וגם "),
            });
          }

          updateTrail(id, cleaned, data, req, res);
        });
      });
    });
  },
);

/* =========================
   ניקוי נתונים
========================= */
function cleanData(data) {
  return {
    cleanName: data.trail_name?.trim(),
    cleanStart: data.start_point?.trim(),
    cleanEnd: data.end_point?.trim(),
    cleanType: data.trail_type?.trim(),
    cleanDesc: data.description?.trim(),
  };
}

/* =========================
   בדיקת שדות חובה
========================= */
function validateRequiredUpdate(clean, data) {
  let errors = [];

  if (!clean.cleanName) errors.push("חסר שם מסלול");
  if (!clean.cleanType) errors.push("חסר סוג מסלול");
  if (!data.difficulty_level) errors.push("חסר רמת קושי");
  if (!data.length_km) errors.push("חסר אורך מסלול");
  if (data.duration_minutes === undefined) errors.push("חסר משך זמן");
  if (!clean.cleanStart) errors.push("חסר נקודת התחלה");
  if (!clean.cleanEnd) errors.push("חסר נקודת סיום");
  if (!data.price_per_person) errors.push("חסר מחיר לאדם");
  if (!clean.cleanDesc) errors.push("חסר תיאור");

  return errors;
}

/* =========================
   בדיקות מספרים
========================= */
function validateNumbersUpdate(clean, data, res, callback) {
  let errors = [];

  const duration = Number(data.duration_minutes);

  if (isNaN(duration)) {
    errors.push("משך זמן המסלול חייב להיות מספר");
  } else if (duration <= 0) {
    errors.push("משך זמן המסלול חייב להיות גדול מ-0");
  }

  if (isNaN(data.length_km) || Number(data.length_km) < 0) {
    errors.push("אורך מסלול לא תקין");
  }

  if (isNaN(data.price_per_person) || Number(data.price_per_person) < 0) {
    errors.push("מחיר לאדם לא תקין");
  }

  if (clean.cleanType !== "רגלי") {
    if (!data.price_per_vehicle) {
      errors.push("חובה להזין מחיר לכלי במסלול שאינו רגלי");
    } else if (
      isNaN(data.price_per_vehicle) ||
      Number(data.price_per_vehicle) < 0
    ) {
      errors.push("מחיר לכלי לא תקין");
    }
  }

  //  בדיקה לפי שעות מערכת
  getMaxActivityMinutes((err, maxMinutes) => {
    if (err) {
      return res.status(500).json({ error: "שגיאה במסד הנתונים" });
    }

    const hours = Math.floor(maxMinutes / 60);
    const minutes = maxMinutes % 60;

    if (duration > maxMinutes) {
      errors.push(
        `משך זמן המסלול לא יכול לעלות על ${hours} שעות ו-${minutes} דקות`,
      );
    }

    callback(errors);
  });
}

/* =========================
   בדיקה שהמסלול קיים
========================= */
function checkTrailExists(id, res, cb) {
  db.query(
    "SELECT trail_id FROM trails WHERE trail_id = ?",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "שגיאת שרת" });

      if (rows.length === 0) {
        return res.status(404).json({ error: "המסלול לא נמצא" });
      }

      cb();
    },
  );
}

/* =========================
   בדיקת כפילות
========================= */
function checkDuplicateTrail(clean, id, res, cb) {
  const sql = `
    SELECT trail_id
    FROM trails
    WHERE trail_name = ?
      AND start_point = ?
      AND end_point = ?
      AND trail_type = ?
      AND trail_id <> ?
  `;

  db.query(
    sql,
    [clean.cleanName, clean.cleanStart, clean.cleanEnd, clean.cleanType, id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "שגיאת שרת" });

      if (rows.length > 0) {
        return res.status(409).json({
          error: " קיים כבר מסלול זהה עם אותו סוג",
        });
      }

      cb();
    },
  );
}

/* =========================
   בדיקת קבצים
========================= */
function validateFiles(req, errors) {
  const gpxFile = req.files?.gpx_file?.[0];
  const imageFile = req.files?.image?.[0];

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
}

/* =========================
   עדכון מסלול
========================= */
function updateTrail(id, clean, data, req, res) {
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
    clean.cleanName,
    clean.cleanType,
    data.difficulty_level,
    data.length_km,
    data.duration_minutes,
    clean.cleanStart,
    clean.cleanEnd,
    data.price_per_person,
    clean.cleanType === "רגלי" ? null : data.price_per_vehicle,
    clean.cleanDesc,
  ];

  const gpxFile = req.files?.gpx_file?.[0];
  const imageFile = req.files?.image?.[0];

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

  db.query(query, values, (err) => {
    if (err) {
      return res.status(500).json({ error: "שגיאה בעדכון מסלול" });
    }

    res.json({
      success: true,
      message: "המסלול עודכן בהצלחה ",
    });
  });
}

/*//================================
// מחיקת כל המסלולים
//ללא שמוש כרגע
//================================*/
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
      message: "כל המסלולים נמחקו בהצלחה ",
    });
  });
});
module.exports = router;
