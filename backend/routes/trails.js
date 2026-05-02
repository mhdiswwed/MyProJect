/*//======================================================
// trails.js
// * רוותיר ראשי להצגת מסלולים (דף הבית)
מציג מסלולים מהמסד עם אפשרות לעבור בין עמודים ולחפש לפי שם או סוג
//======================================================*/


const express = require("express");
const router = express.Router();
//routes/user.js
const dbSingleton = require('../dbSingleton')


// Execute a query to the database
const db = dbSingleton.getConnection();

/**
 * מחזיר את כל המסלולים מהמסד
 */
/*router.get("/", (req, res) => {
  const sql = "SELECT * FROM trails ORDER BY length_km ASC"; // מיון לפי אורך

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "שגיאת שרת" });
    }

    res.json(results);
  });
});
*/


/**
 * מחזיר את 8 מסלולים מהמסד
 מיון לפי אורך מסלול*/
router.get("/", (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = 8;
  const offset = (page - 1) * limit;

  const sql = `
    SELECT * FROM trails
    ORDER BY length_km ASC
    LIMIT ? OFFSET ?
  `;

  db.query(sql, [limit, offset], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "שגיאת שרת" });
    }
    res.json(results);
  });
});









//=========================================================
/*חיפוש לפי שם*/ 
router.get("/search", (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "לא נשלח שם לחיפוש",
    });
  }

  const sql = `
    SELECT * FROM trails
    WHERE trail_name LIKE ?
    ORDER BY length_km ASC
  `;

  db.query(sql, [`%${name}%`], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "שגיאה בחיפוש לפי שם",
      });
    }

    res.json({
      success: true,
      message: rows.length ? "נמצאו תוצאות" : "לא נמצאו מסלולים",
      data: rows,
    });
  });
});



/*חיפוש לפי סוג*/ 
router.get("/type/:type", (req, res) => {
  const { type } = req.params;

  const sql = `
    SELECT * FROM trails
    WHERE trail_type = ?
    ORDER BY length_km ASC
  `;

  db.query(sql, [type], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "שגיאה בשליפה לפי סוג",
      });
    }

    res.json({
      success: true,
      message: rows.length ? "מסלולים נטענו" : "אין מסלולים מסוג זה",
      data: rows,
    });
  });
});
//==================================================================


module.exports = router;
