const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

//שליפת המע''מ
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


//עדכון המע''מ
router.put("/vat", (req, res) => {
  const { vat } = req.body;

  if (vat === undefined || vat === null) {
    return res.status(400).json({ message: "יש לשלוח ערך מע״מ" });
  }

  const vatNumber = Number(vat);

  if (isNaN(vatNumber) || vatNumber < 0 || vatNumber > 100) {
    return res
      .status(400)
      .json({ message: "ערך המע״מ חייב להיות בין 0 ל-100" });
  }

  db.query(
    "UPDATE system_settings SET setting_value=? WHERE setting_name='vat'",
    [vatNumber],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "שגיאה בעדכון המע״מ" });
      }

      res.json({
        message: "המע״מ עודכן בהצלחה",
        vat: vatNumber,
      });
    },
  );
});
module.exports = router;
