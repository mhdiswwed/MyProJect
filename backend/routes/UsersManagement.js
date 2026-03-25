/**
------------------------------------------------
ראוטר UsersManagement
------------------------------------------------

פעולות:
- שליפת משתמשים
- עריכת משתמש
- חסימה / הפעלה
- מחיקה
*/
const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");

// Execute a query to the database
const db = dbSingleton.getConnection();


/**
------------------------------------------------
ראוטר UsersManagement
------------------------------------------------
*/

/* =========================
   שליפת משתמשים
========================= */
router.get("/users", (req, res) => {
  const sql = `
    SELECT user_id, full_name, email, phone, role, active, created_at
    FROM users
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json([]);
    res.json(result);
  });
});

/* =========================
   עדכון משתמש
========================= */
router.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const { full_name, phone, role } = req.body;

  const sql = `
    UPDATE users
    SET full_name=?, phone=?, role=?
    WHERE user_id=?
  `;

  db.query(sql, [full_name, phone, role, id], (err) => {
    if (err) return res.status(500).json({ message: "שגיאה" });
    res.json({ message: "עודכן" });
  });
});

/* =========================
   חסימה / הפעלה
========================= */
router.put("/users/toggle/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    UPDATE users
    SET active = NOT active
    WHERE user_id = ?
  `;

  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ message: "שגיאה" });
    res.json({ message: "עודכן" });
  });
});

/* =========================
   מחיקה
========================= */
router.delete("/users/:id", (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM users WHERE user_id=?`;

  db.query(sql, [id], (err) => {
    // ❌ אם יש שגיאה (לרוב FK)
    if (err) {
      return res.status(400).json({
        message: "לא ניתן למחוק משתמש - קיימים נתונים קשורים",
      });
    }

    // ✅ הצלחה
    res.json({ message: "נמחק" });
  });
});

module.exports = router;