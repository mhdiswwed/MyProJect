/**
 * =====================================================
 * ראוטר לעדכון קבוצה (קשור לפופאפ UpdateGroupModal)
 * =====================================================
 *
 * זה ראוטר ייעודי לפופאפ בלבד
 * לא קשור ל-manageGroups הכללי
 */

const express = require("express");
const router = express.Router();

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer");

/**
 * ------------------------------------------------
 * שליפת נתוני קבוצה + מדריך + מנהל (לחשבונית)
 * ------------------------------------------------
 */
const getGroupSql = `
SELECT 
g.*,
t.trail_name,
t.price_per_person,
t.price_per_vehicle,


tr.number_of_participants,
tr.number_of_vehicles,

-- מדריך
u.full_name AS guide_name,
u.phone AS guide_phone,
u.email AS guide_email,

-- מנהל
m.full_name AS manager_name,
m.phone AS manager_phone,
m.email AS manager_email

FROM groups g

JOIN trails t ON g.trail_id = t.trail_id

JOIN trip_requests tr ON g.request_id = tr.request_id

JOIN users u ON g.guide_id = u.user_id
JOIN users m ON m.role = 'מנהל'

WHERE g.group_id = ?
LIMIT 1
`;

/**
 * ------------------------------------------------
 * יצירת תיקיית חשבוניות אם לא קיימת
 * ------------------------------------------------
 */
const invoicesDir = path.join(__dirname, "../uploads/invoices");

if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

/**
 * ------------------------------------------------
 * שליפת המע״מ מהמערכת
 * ------------------------------------------------
 */
function getVatRate(callback) {
  const sql = `
    SELECT setting_value
    FROM system_settings
    WHERE setting_name = 'vat'
    LIMIT 1
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      return callback(err);
    }

    if (!rows.length) {
      return callback(new Error("לא נמצא ערך מע״מ במערכת"));
    }

    const vat = Number(rows[0].setting_value) / 100;
    callback(null, vat);
  });
}


// =========================
// המרת שעה לדקות
// =========================
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// =========================
// בדיקת זמינות מדריך
// =========================
function checkGuideAvailability(
  guideId,
  tripDate,
  tripTime,
  duration,
  ignoreGroupId,
  callback,
) {
  const start = timeToMinutes(tripTime);
  const BUFFER = 30;
  const end = start + Number(duration) + BUFFER;

  const sql = `
    SELECT g.trip_time, t.duration_minutes
    FROM groups g
    JOIN trails t ON g.trail_id = t.trail_id
    WHERE g.guide_id = ?
      AND DATE(g.trip_date) = DATE(?)
      AND g.status = 'פעיל'
      AND g.group_id <> ?
  `;

  db.query(sql, [guideId, tripDate, ignoreGroupId], (err, rows) => {
    if (err) return callback(err);

    for (const row of rows) {
      const s = timeToMinutes(row.trip_time);
      const e = s + Number(row.duration_minutes) + BUFFER;

      if (start < e && s < end) {
        return callback(null, false);
      }
    }

    callback(null, true);
  });
}


/**
 * ------------------------------------------------
 * שליפת מדריכים פנויים אמיתית (כולל חפיפות)
 * ------------------------------------------------
 */
// שליפת מדריכים פנויים לפי תאריך, שעה, משך וחפיפות כולל 30 דקות הפסקה
router.get("/available-guides", async (req, res) => {
  const { date, time, group_id } = req.query;

  // בדיקת נתונים
  if (!date || !time || !group_id) {
    return res.status(400).json({ message: "חסר נתונים" });
  }

  // תיקון תאריך לישראל (בלי UTC)
  const localDate = new Date(date);
  const cleanDate = localDate.toLocaleDateString("en-CA"); // YYYY-MM-DD

  // שליפת משך המסלול לפי הקבוצה
  const durationSql = `
    SELECT t.duration_minutes
    FROM groups g
    JOIN trails t ON g.trail_id = t.trail_id
    WHERE g.group_id = ?
  `;

  db.query(durationSql, [group_id], (err, durationResult) => {
    if (err || !durationResult.length) {
      return res.status(500).json({ message: "שגיאה במסלול" });
    }

    const duration = durationResult[0].duration_minutes;

    // יצירת זמן התחלה נכון (בלי בעיות timezone)
    const [hours, minutes] = time.split(":");
    const newStart = new Date(cleanDate);
    newStart.setHours(hours, minutes, 0, 0);

    const newEnd = new Date(newStart.getTime() + duration * 60000);

    const buffer = 30 * 60000;

    // שליפת כל המדריכים
    db.query(
      `SELECT user_id, full_name FROM users WHERE role='מדריך'`,
      (err, guides) => {
        if (err) return res.status(500).json([]);

        const availableGuides = [];
        let checked = 0;

        guides.forEach((guide) => {
          const checkSql = `
            SELECT g.trip_time, t.duration_minutes
            FROM groups g
            JOIN trails t ON g.trail_id = t.trail_id
            WHERE g.guide_id = ?
            AND DATE(g.trip_date) = ?
            AND g.status != 'בוטל'
            AND g.group_id <> ?
          `;

          db.query(
            checkSql,
            [guide.user_id, cleanDate, group_id],
            (err, trips) => {
              if (err) return;

              let isAvailable = true;

              for (let trip of trips) {
                const [h, m] = trip.trip_time.split(":");

                const existingStart = new Date(cleanDate);
                existingStart.setHours(h, m, 0, 0);

                const existingEnd = new Date(
                  existingStart.getTime() + trip.duration_minutes * 60000,
                );

                const existingEndWithBuffer = new Date(
                  existingEnd.getTime() + buffer,
                );

                // בדיקת חפיפה
                if (
                  newStart < existingEndWithBuffer &&
                  newEnd > existingStart
                ) {
                  isAvailable = false;
                  break;
                }
              }

              if (isAvailable) {
                availableGuides.push(guide);
              }

              checked++;

              if (checked === guides.length) {
                res.json(availableGuides);
              }
            },
          );
        });
      },
    );
  });
});



// =========================
// PUT החלפת מדריך בלבד
// =========================
router.put("/change-guide/:group_id", async (req, res) => {
  const { group_id } = req.params;
  const { guide_id, reason } = req.body;

  if (!guide_id || !reason) {
    return res.status(400).json({
      message: "חובה לבחור מדריך ולכתוב סיבה",
    });
  }

  const sql = `
    UPDATE groups
    SET guide_id = ?, guide_change_reason = ?
    WHERE group_id = ?
  `;

  db.query(sql, [guide_id, reason, group_id], async (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "שגיאה בשרת" });
    }

    try {
      // 🧨 מחיקת חשבונית ישנה
      await db
        .promise()
        .query("UPDATE groups SET invoice_file = NULL WHERE group_id = ?", [
          group_id,
        ]);

      // 🧠 שליפת נתונים
      const [results] = await db.promise().query(getGroupSql, [group_id]);
      const groupData = results[0];

      // 📊 שליפת מע״מ
      getVatRate(async (err, vatRate) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "שגיאה במע״מ" });
        }

        // ✅ עכשיו מחשבים
        const participantsPrice =
          Number(groupData.number_of_participants || 0) *
          Number(groupData.price_per_person || 0);

        const vehiclesPrice =
          Number(groupData.number_of_vehicles || 0) *
          Number(groupData.price_per_vehicle || 0);

        const totalBeforeVat = participantsPrice + vehiclesPrice;
        const vatAmount = totalBeforeVat * vatRate;
        const totalWithVat = totalBeforeVat + vatAmount;

        // יצירת חשבונית
        const fileName = await createInvoicePDF(
          {
            ...groupData,
            total_before_vat: totalBeforeVat,
            vat_amount: vatAmount,
            total_with_vat: totalWithVat,
          },
          vatRate,
        );

        await db
          .promise()
          .query("UPDATE groups SET invoice_file = ? WHERE group_id = ?", [
            fileName,
            group_id,
          ]);

        res.json({ message: "המדריך הוחלף + חשבונית עודכנה" });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "שגיאה ביצירת חשבונית" });
    }
  });
});

/**
 * ------------------------------------------------
 * פונקציה ליצירת חשבונית PDF בעברית
 * באמצעות HTML → PDF (Puppeteer)
 *
 * היתרון:
 * - עברית עובדת מושלם
 * - אין בעיות RTL
 * - ניתן לעצב עם CSS
 * ------------------------------------------------
 */
async function createInvoicePDF(data, VAT_RATE) {
  /* יצירת שם קובץ לחשבונית */
  const fileName = `invoice_${data.group_id}.pdf`;

  /* נתיב שמירת הקובץ בתיקיית החשבוניות */
  const filePath = path.join(invoicesDir, fileName);

  /**
   * חישובי מחירים
   * סכום משתתפים
   */
const participantsTotal =
  Number(data.number_of_participants || 0) * Number(data.price_per_person || 0);

  /**
   * סכום כלי רכב
   */
const vehiclesTotal =
  Number(data.number_of_vehicles || 0) * Number(data.price_per_vehicle || 0);

  /**
   * סכום כולל לפני מע״מ
   */
  const totalBeforeVat = participantsTotal + vehiclesTotal;

  /**
   * חישוב מע״מ
   */
  const vatAmount = totalBeforeVat * VAT_RATE;

  /**
   * סכום כולל לאחר מע״מ
   */
  const totalWithVat = totalBeforeVat + vatAmount;

  /**
   * תבנית HTML של החשבונית
   * dir="rtl" גורם לעברית להופיע נכון
   */
  const html = `
  <html dir="rtl">
  <head>

  <!-- הגדרת קידוד עברית -->
  <meta charset="UTF-8">

  <style>

  /* עיצוב כללי של הדף */
  body{
    font-family: Arial;
    direction: rtl;
    padding:40px;
  }

  /* כותרת החשבונית */
  h1{
    text-align:center;
  }

  /* עיצוב הטבלה */
  table{
    width:100%;
    border-collapse: collapse;
    margin-top:20px;
  }

  /* עיצוב תאים */
  th,td{
    border:1px solid #ccc;
    padding:10px;
    text-align:center;
  }

  /* עיצוב שורות סכום */
  .total{
    font-weight:bold;
    background:#f5f5f5;
  }

  </style>
  </head>

  <body>

  <h1>חשבונית</h1>

  <h3>Trail Quest</h3>

  <!-- פרטי הקבוצה -->
  <p>מספר קבוצה: ${data.group_id}</p>
  <p>מסלול: ${data.trail_name}</p>
  <p>תאריך: ${new Date(data.trip_date).toLocaleDateString("he-IL")}</p>
  <p>שעה: ${data.trip_time?.slice(0, 5)}</p>

  <!-- פרטי המדריך -->
  <h3>פרטי מדריך</h3>

  <p>שם: ${data.guide_name}</p>
  <p>טלפון: ${data.guide_phone}</p>
  <p>אימייל: ${data.guide_email}</p>

  <!-- טבלת מחירים -->
  <table>

  <tr>
  <th>תיאור</th>
  <th>כמות</th>
  <th>מחיר</th>
  <th>סה"כ</th>
  </tr>

  <!-- שורת משתתפים -->
  <tr>
  <td>משתתפים</td>
  <td>${data.number_of_participants}</td>
  <td>₪${Number(data.price_per_person || 0)}</td>
  <td>₪${participantsTotal.toFixed(2)}</td>
  </tr>

  <!-- שורת כלי רכב -->
  <tr>
  <td>כלי רכב</td>
  <td>${data.number_of_vehicles}</td>
  <td>₪${Number(data.price_per_vehicle || 0)}</td>
  <td>₪${vehiclesTotal.toFixed(2)}</td>
  </tr>

  <!-- סכום לפני מע״מ -->
  <tr class="total">
  <td colspan="3">סה"כ לפני מע״מ</td>
  <td>₪${totalBeforeVat.toFixed(2)}</td>
  </tr>

  <!-- סכום מע״מ -->
  <tr class="total">
  <td colspan="3">מע״מ</td>
  <td>₪${vatAmount.toFixed(2)}</td>
  </tr>

  <!-- סכום סופי -->
  <tr class="total">
  <td colspan="3">סה"כ לתשלום</td>
  <td>₪${totalWithVat.toFixed(2)}</td>
  </tr>

  </table>

  <!-- ------------------------------------------------ -->
<!-- פרטי החברה -->
<!-- מוצגים בתחתית החשבונית -->
<!-- ------------------------------------------------ -->

<hr style="margin-top:40px">

<h3>פרטי החברה</h3>

<p>
<strong>שם החברה:</strong> Trail Quest
</p>

<p>
<strong>טלפון:</strong> ${data.manager_phone}
</p>

<p>
<strong>אימייל:</strong> ${data.manager_email}
</p>

<p style="margin-top:20px;font-size:12px;color:#555">
תודה שבחרתם לטייל איתנו!
</p>

  </body>
  </html>
  `;

  /**
   * פתיחת דפדפן וירטואלי באמצעות Puppeteer
   */
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  /**
   * טעינת ה-HTML לתוך הדף
   */
  await page.setContent(html);

  /**
   * יצירת קובץ PDF
   */
  await page.pdf({
    path: filePath,
    format: "A4",
  });

  /**
   * סגירת הדפדפן
   */
  await browser.close();

  /**
   * החזרת שם הקובץ שנוצר
   */
  return fileName;
}

module.exports = router;