/**
 * routes/myRequests.js
 * ------------------------------------------------
 * ראוטר לניהול הבקשות של המשתמש
 *
 * כולל:
 * - שליפת הבקשות של המשתמש
 * - חישוב מחירים ומע״מ
 * - שליחת בקשת ביטול
 */

const express = require("express");
const router = express.Router();


const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();





/**
 * ------------------------------------------------
 * פונקציה לשליפת המע״מ מהמערכת
 * ------------------------------------------------
 * המע״מ נשמר בטבלת system_settings
 * ולכן אנו שולפים אותו מהמסד כדי שהמערכת
 * תישאר דינמית במקרה שהמע״מ משתנה
 */

function getVatRate(callback) {
  const sql = `
  SELECT setting_value
  FROM system_settings
  WHERE setting_name = 'vat'
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      return callback(err);
    }

    if (!rows.length) {
      return callback(new Error("לא נמצא ערך מע״מ במערכת"));
    }

    /**
     * המרה לאחוז עשרוני
     * לדוגמה:
     * 17%  →  0.17
     */
    const vat = Number(rows[0].setting_value) / 100;

    callback(null, vat);
  });
}





/**
 * ------------------------------------------------
 * GET
 * שליפת הבקשות של משתמש
 * ------------------------------------------------
 */

router.get("/:userId", (req, res) => {
  const userId = req.params.userId;

  /**
   * שליפת המע״מ לפני חישוב המחירים
   */
  getVatRate((err, VAT_RATE) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        message: "שגיאה בשליפת המע״מ מהמערכת",
      });
    }

    const sql = `
SELECT

tr.request_id,

/* הנתונים המקוריים של הבקשה */
tr.trip_date,
tr.trip_time,

/* הנתונים לאחר שינוי שביצע המנהל */
grp.trip_date AS changed_trip_date,
grp.trip_time AS changed_trip_time,

/* סטטוס ההדרכה */
gd.status AS guidance_status,


/* סיבת שינוי */
grp.change_reason,
grp.cancel_reason AS group_cancel_reason,
grp.guide_change_reason,

tr.number_of_participants,
tr.number_of_vehicles,
tr.status,
tr.cancel_reason,
tr.cancel_requested,
tr.reject_reason,
tr.cancel_reject_reason,
tr.cancel_admin_response,

t.trail_name,
t.price_per_person,
t.price_per_vehicle,

/* מדריך מקורי */
g.full_name AS guide_name,
g.phone AS guide_phone,
g.email AS guide_email,

/* מדריך לאחר שינוי */
g2.full_name AS changed_guide_name

FROM trip_requests tr

JOIN trails t
ON tr.trail_id = t.trail_id

/* טבלת הקבוצות - כאן נמצאים השינויים */
LEFT JOIN groups grp
ON tr.request_id = grp.request_id

/* טבלת הדרכות (הסטטוס) */
LEFT JOIN guidances gd
ON grp.group_id = gd.group_id

/* מדריך מקורי */
LEFT JOIN users g
ON tr.guide_id = g.user_id

/* מדריך לאחר שינוי */
LEFT JOIN users g2
ON grp.guide_id = g2.user_id

WHERE tr.user_id = ?

ORDER BY 
  CASE
    /* 1️⃣ הכי חשוב – ממתין או מבקש ביטול */
    WHEN tr.status = 'ממתין' OR tr.cancel_requested = 1 THEN 1

    /* 2️⃣ מאושר קרוב (עד יומיים) */
    WHEN tr.status = 'מאושר'
      AND TIMESTAMPDIFF(HOUR, NOW(), CONCAT(tr.trip_date, ' ', tr.trip_time)) BETWEEN 0 AND 48
    THEN 2

    /* 3️⃣ מאושר רגיל (עוד לא התחיל) */
    WHEN tr.status = 'מאושר' AND gd.status ='מתוכנן'THEN 3

    /* 4️⃣ הקבוצה בטיול */
    WHEN tr.status = 'מאושר' AND gd.status = 'בתהליך' THEN 4

    /* 5️⃣ הטיול הסתיים */
    WHEN tr.status = 'מאושר' AND gd.status = 'הסתיים' THEN 5

    /* 4️⃣ נדחה */
    WHEN tr.status = 'נדחה' THEN 6

    /* 5️⃣ מבוטל */
    ELSE 7
  END,

  /* בתוך כל קבוצה – מיון לפי זמן */
  CONCAT(tr.trip_date, ' ', tr.trip_time) ASC`;
    

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json(err);
      }

      /**
       * ------------------------------------------------
       * חישוב מחירים לכל בקשה
       * ------------------------------------------------
       */

      const data = results.map((r) => {
        /**
         * מחירים בסיסיים למסלול
         */
        const pricePerPerson = Number(r.price_per_person || 0);
        const pricePerVehicle = Number(r.price_per_vehicle || 0);

                /**
         * מחירים ליחיד כולל מע״מ
         */
    const pricePerPersonWithVat = Number(
      (pricePerPerson * (1 + VAT_RATE)).toFixed(2),
    );

    const pricePerVehicleWithVat = Number(
      (pricePerVehicle * (1 + VAT_RATE)).toFixed(2),
    );


        /**
         * נתוני הבקשה
         */
        const participants = Number(r.number_of_participants || 0);
        const vehicles = Number(r.number_of_vehicles || 0);

        /**
         * חישוב מחיר משתתפים
         */
        const participantsPrice = participants * pricePerPerson;

        /**
         * חישוב מחיר כלי רכב
         */
        const vehiclesPrice = vehicles * pricePerVehicle;

        /**
         * סכום כולל לפני מע״מ
         */
        const totalBeforeVat = participantsPrice + vehiclesPrice;

        /**
         * סכום המע״מ
         */
        const vatAmount = totalBeforeVat * VAT_RATE;

        /**
         * סכום כולל אחרי מע״מ
         */
        const totalWithVat = totalBeforeVat + vatAmount;

      return {
        request_id: r.request_id,

        trail_name: r.trail_name,

        trip_date: r.trip_date,
        trip_time: r.trip_time,

        /* נתונים לאחר שינוי */
        changed_trip_date: r.changed_trip_date,
        changed_trip_time: r.changed_trip_time,
        changed_guide_name: r.changed_guide_name,

        /* הודעות שינוי */
        change_reason: r.change_reason,
        guide_change_reason: r.guide_change_reason,

        number_of_participants: participants,
        number_of_vehicles: vehicles,

        guide_name: r.guide_name,
        guide_phone: r.guide_phone,
        guide_email: r.guide_email,

        price_per_person: pricePerPerson,
        price_per_vehicle: pricePerVehicle,

        price_per_person_with_vat: pricePerPersonWithVat,
        price_per_vehicle_with_vat: pricePerVehicleWithVat,

        total_before_vat: totalBeforeVat,
        vat_amount: vatAmount,
        total_with_vat: totalWithVat,

        status: r.status,

        cancel_reason: r.cancel_reason,
        cancel_requested: r.cancel_requested,

        group_cancel_reason: r.group_cancel_reason,

        /**
         * סטטוס ההדרכה (בתהליך / הסתיים)
         */
        guidance_status: r.guidance_status,

        reject_reason: r.reject_reason,
        cancel_reject_reason: r.cancel_reject_reason,
        cancel_admin_response: r.cancel_admin_response,
      };
      });

      res.json(data);
    });
  });
});





/**
 * ------------------------------------------------
 * GET
 * שליפת פרטי קבוצה לפי request_id
 * ------------------------------------------------
 */

router.get("/byRequest/:requestId", (req, res) => {

  const requestId = req.params.requestId;

  const sql = `

  SELECT

  g.group_id,
  g.trip_date,
  g.trip_time,
  g.meeting_point,
  g.status,
  g.invoice_file,

  u.full_name AS guide_name,
  u.phone AS guide_phone,
  u.email AS guide_email

  FROM groups g

  JOIN users u
  ON g.guide_id = u.user_id

  WHERE g.request_id = ?

  LIMIT 1
  `;

  db.query(sql, [requestId], (err, results) => {

    if (err) {
      console.error("שגיאה בשליפת קבוצה:", err);
      return res.status(500).json(err);
    }

    if (!results.length) {
      return res.json(null);
    }

    /**
     * מחזירים את הקבוצה בלבד
     * החשבונית כבר נוצרה כאשר המנהל אישר את הבקשה
     */

    res.json(results[0]);

  });

});





/**
 * ------------------------------------------------
 * PUT
 * שליחת בקשת ביטול
 * ------------------------------------------------
 *
 * משנה את הסטטוס ל:
 * "מבקש ביטול"
 */

router.put("/cancelRequest/:requestId", (req, res) => {
  const requestId = req.params.requestId;
  const reason = req.body.reason;

  /* שליפת סטטוס הבקשה */
  const checkSql = `
  SELECT status
  FROM trip_requests
  WHERE request_id = ?
  LIMIT 1
  `;

  db.query(checkSql, [requestId], (err, rows) => {
    if (err || !rows.length) {
      return res.status(500).json({ message: "שגיאה בבדיקת הבקשה" });
    }

    const status = rows[0].status;

    /* עדכון הבקשה */
    const updateRequestSql = `
    UPDATE trip_requests
    SET
    status = 'מבקש ביטול',
    cancel_reason = ?,
    cancel_requested = 1
    WHERE request_id = ?
    `;

    db.query(updateRequestSql, [reason, requestId], (err) => {
      if (err) {
        return res.status(500).json(err);
      }

      /**
       * אם הבקשה כבר מאושרת
       * יש קבוצה ולכן צריך לעדכן אותה
       */
      if (status === "מאושר") {
        const updateGroupSql = `
        UPDATE groups
        SET status = 'מבקש ביטול'
        WHERE request_id = ?
        `;

        db.query(updateGroupSql, [requestId], (err) => {
          if (err) {
            return res.status(500).json(err);
          }

          res.json({
            message: "בקשת הביטול נשלחה למנהל",
          });
        });
      } else {

      /**
       * אם הבקשה עדיין ממתינה
       * אין קבוצה ולכן לא מעדכנים groups
       */
        res.json({
          message: "בקשת הביטול נשלחה למנהל",
        });
      }
    });
  });
});

module.exports = router;
