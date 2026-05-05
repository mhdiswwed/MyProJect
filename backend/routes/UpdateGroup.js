/**
 * =========================================================
 * UpdateGroup.js
 * הראוטר מאפשר למנהל להחליף מדריך לקבוצה, בודק אם הוא פנוי בזמן הטיול, ואם כן מעדכן את הקבוצה וגם יוצר מחדש חשבונית בהתאם לשינוי
 ===========================================================*/

const express = require("express");
const router = express.Router();

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer");

//==========================
// שליפת זמן הפסקה של מדריך
//==========================
function getGuideBreakMinutes(callback) {
  const sql = `
    SELECT setting_value
    FROM system_settings
    WHERE setting_name = 'guide_break_minutes'
    LIMIT 1
  `;

  db.query(sql, (err, rows) => {
    if (err || !rows.length) {
      return callback(30); // ברירת מחדל
    }

    callback(Number(rows[0].setting_value));
  });
}

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

// בודק נתונים
function isValidRequest(date, time, group_id) {
  return date && time && group_id;
}

// ממיר תאריך לפורמט נקי
function getCleanDate(date) {
  const localDate = new Date(date);
  return localDate.toLocaleDateString("en-CA");
}

// מחזיר משך זמן מסלול
function getDuration(group_id, callback) {
  const sql = `
    SELECT t.duration_minutes
    FROM groups g
    JOIN trails t ON g.trail_id = t.trail_id
    WHERE g.group_id = ?
  `;
  db.query(sql, [group_id], callback);
}

// מחשב זמן התחלה וסיום
function getStartEnd(cleanDate, time, duration) {
  const [h, m] = time.split(":");

  const start = new Date(cleanDate);
  start.setHours(h, m, 0, 0);

  const end = new Date(start.getTime() + duration * 60000);

  return { start, end };
}

// בודק אם מדריך פנוי
function checkTrips(trips, cleanDate, start, end, buffer) {
  for (let trip of trips) {
    const [h, m] = trip.trip_time.split(":");

    const existingStart = new Date(cleanDate);
    existingStart.setHours(h, m, 0, 0);

    const existingEnd = new Date(
      existingStart.getTime() + trip.duration_minutes * 60000
    );

    const existingEndWithBuffer = new Date(existingEnd.getTime() + buffer);
    const newEndWithBuffer = new Date(end.getTime() + buffer);

    const isBefore = newEndWithBuffer <= existingStart;
    const isAfter = start >= existingEndWithBuffer;

    if (!(isBefore || isAfter)) {
      return false;
    }
  }

  return true;
}

// מחזיר מדריכים פנויים
function loadAvailableGuides(cleanDate, group_id, start, end, buffer, res) {
  db.query(
    `SELECT user_id, full_name FROM users WHERE role='מדריך'`,
    (err, guides) => {
      if (err) return res.status(500).json([]);

      const availableGuides = [];
      let checked = 0;

      guides.forEach((guide) => {
        const sql = `
          SELECT g.trip_time, t.duration_minutes
          FROM groups g
          JOIN trails t ON g.trail_id = t.trail_id
          WHERE g.guide_id = ?
          AND DATE(g.trip_date) = ?
          AND g.status != 'בוטל'
          AND g.group_id <> ?
        `;

        db.query(sql, [guide.user_id, cleanDate, group_id], (err, trips) => {
          if (!err) {
            const ok = checkTrips(trips, cleanDate, start, end, buffer);
            if (ok) availableGuides.push(guide);
          }

          checked++;

          if (checked === guides.length) {
            res.json(availableGuides);
          }
        });
      });
    }
  );
}


// שליפת מדריכים פנויים
router.get("/available-guides", (req, res) => {
  const { date, time, group_id } = req.query;

  if (!isValidRequest(date, time, group_id)) {
    return res.status(400).json({ message: "חסר נתונים" });
  }

  const cleanDate = getCleanDate(date);

  getDuration(group_id, (err, result) => {
    if (err || !result.length) {
      return res.status(500).json({ message: "שגיאה במסלול" });
    }

    const duration = result[0].duration_minutes;
    const { start, end } = getStartEnd(cleanDate, time, duration);

    getGuideBreakMinutes((BUFFER_MINUTES) => {
      const buffer = BUFFER_MINUTES * 60000;

      loadAvailableGuides(cleanDate, group_id, start, end, buffer, res);
    });
  });
});



/**
 * --------------------------------------------------
 * פונקציה להחלפת מדריך בקבוצה ועדכון חשבונית
 *
 * מקבלת:
 * group_id - מזהה הקבוצה
 * guide_id - מזהה המדריך החדש
 * reason   - סיבת ההחלפה
 *
 * מבצעת:
 * - עדכון המדריך בטבלת groups
 * - מחיקת החשבונית הישנה
 * - שליפת נתוני הקבוצה
 * - חישוב מחירים ומע״מ
 * - יצירת חשבונית PDF חדשה
 * - שמירת שם הקובץ במסד הנתונים
 *
 * מחזירה:
 * fileName - שם קובץ החשבונית שנוצרה
 * --------------------------------------------------
 */
async function changeGuideAndUpdateInvoice(group_id, guide_id, reason) {
  // עדכון המדריך והסיבה בטבלת groups
  const updateSql = `
    UPDATE groups
    SET guide_id = ?, guide_change_reason = ?
    WHERE group_id = ?
  `;

  await db.promise().query(updateSql, [guide_id, reason, group_id]);

  // מחיקת שם קובץ החשבונית הישנה (כדי לייצר חדשה)
  await db
    .promise()
    .query("UPDATE groups SET invoice_file = NULL WHERE group_id = ?", [
      group_id,
    ]);

  // שליפת נתוני הקבוצה מהמסד
  const [results] = await db.promise().query(getGroupSql, [group_id]);
  const groupData = results[0];

  // שליפת אחוז מע״מ (המרה ל-Promise)
  const vatRate = await new Promise((resolve, reject) => {
    getVatRate((err, rate) => {
      if (err) reject(err);
      else resolve(rate);
    });
  });

  // יצירת חשבונית PDF חדשה
const fileName = await createInvoicePDF(groupData, vatRate);

  // שמירת שם קובץ החשבונית במסד
  await db
    .promise()
    .query("UPDATE groups SET invoice_file = ? WHERE group_id = ?", [
      fileName,
      group_id,
    ]);

  // החזרת שם הקובץ
  return fileName;
}



/**
 * ----------------------------------------
 * PUT החלפת מדריך בלבד
 * ----------------------------------------
 */
router.put("/change-guide/:group_id", async (req, res) => {
  // שליפת מזהה קבוצה מה־URL
  const { group_id } = req.params;
  // שליפת נתונים מה־Body
  const { guide_id, reason } = req.body;

  // בדיקת תקינות קלט
  if (!guide_id || !reason) {
    return res.status(400).json({
      message: "חובה לבחור מדריך ולכתוב סיבה",
    });
  }

  try {
    // קריאה לפונקציית הלוגיקה
    await changeGuideAndUpdateInvoice(group_id, guide_id, reason);

    // החזרת תשובה תקינה
    res.json({
      message: "המדריך הוחלף + חשבונית עודכנה",
    });

  } catch (error) {

    // הדפסת השגיאה לשרת
    console.error(error);

    // החזרת שגיאה ללקוח
    res.status(500).json({
      message: "שגיאה בשרת",
    });
  }
});


/**
 * ----------------------------------------
 * פונקציה שמבצעת את כל החישובים לחשבונית
 * ----------------------------------------
 */
function calculateInvoiceTotals(data, VAT_RATE) {

  // חישוב סכום משתתפים (כמות * מחיר לאדם)
  const participantsTotal =
    Number(data.number_of_participants || 0) *
    Number(data.price_per_person || 0);

  // חישוב סכום כלי רכב (כמות * מחיר לרכב)
  const vehiclesTotal =
    Number(data.number_of_vehicles || 0) *
    Number(data.price_per_vehicle || 0);

  // חישוב סכום כולל לפני מע״מ
  const totalBeforeVat = participantsTotal + vehiclesTotal;

  // חישוב סכום המע״מ לפי אחוז המע״מ
  const vatAmount = totalBeforeVat * VAT_RATE;

  // חישוב סכום כולל לאחר הוספת מע״מ
  const totalWithVat = totalBeforeVat + vatAmount;

  // החזרת כל הערכים המחושבים כאובייקט
  return {
    participantsTotal,
    vehiclesTotal,
    totalBeforeVat,
    vatAmount,
    totalWithVat,
  };
}

/**
 * ----------------------------------------
 * פונקציה שיוצרת ומחזירה HTML לחשבונית
 * ----------------------------------------
 */
function generateInvoiceHTML(data, totals) {

  // החזרת מחרוזת HTML מלאה
  return `
  <html dir="rtl">
  <head>

  <!-- קידוד עברית -->
  <meta charset="UTF-8">

  <style>

    /* עיצוב כללי של הדף */
    body{
      font-family: Arial;
      direction: rtl;
      padding:40px;
    }

    /* כותרת ראשית */
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

    /* שורות סכום */
    .total{
      font-weight:bold;
      background:#f5f5f5;
    }

  </style>
  </head>

  <body>

  <!-- כותרת החשבונית -->
  <h1>חשבונית</h1>

  <!-- שם החברה -->
  <h3>Trail Quest</h3>

  <!-- פרטי הקבוצה -->
  <p>מספר קבוצה: ${data.group_id}</p>
  <p>מסלול: ${data.trail_name}</p>
  <p>תאריך: ${new Date(data.trip_date).toLocaleDateString("he-IL")}</p>
  <p>שעה: ${data.trip_time?.slice(0, 5)}</p>

  <!-- פרטי מדריך -->
  <h3>פרטי מדריך</h3>
  <p>שם: ${data.guide_name}</p>
  <p>טלפון: ${data.guide_phone}</p>
  <p>אימייל: ${data.guide_email}</p>

  <!-- טבלת מחירים -->
  <table>

    <!-- כותרות -->
    <tr>
      <th>תיאור</th>
      <th>כמות</th>
      <th>מחיר</th>
      <th>סה"כ</th>
    </tr>

    <!-- משתתפים -->
    <tr>
      <td>משתתפים</td>
      <td>${data.number_of_participants}</td>
      <td>₪${Number(data.price_per_person || 0)}</td>
      <td>₪${totals.participantsTotal.toFixed(2)}</td>
    </tr>

    <!-- כלי רכב -->
    <tr>
      <td>כלי רכב</td>
      <td>${data.number_of_vehicles}</td>
      <td>₪${Number(data.price_per_vehicle || 0)}</td>
      <td>₪${totals.vehiclesTotal.toFixed(2)}</td>
    </tr>

    <!-- סכום לפני מע״מ -->
    <tr class="total">
      <td colspan="3">סה"כ לפני מע״מ</td>
      <td>₪${totals.totalBeforeVat.toFixed(2)}</td>
    </tr>

    <!-- מע״מ -->
    <tr class="total">
      <td colspan="3">מע״מ</td>
      <td>₪${totals.vatAmount.toFixed(2)}</td>
    </tr>

    <!-- סכום סופי -->
    <tr class="total">
      <td colspan="3">סה"כ לתשלום</td>
      <td>₪${totals.totalWithVat.toFixed(2)}</td>
    </tr>

  </table>

  <!-- קו הפרדה -->
  <hr style="margin-top:40px">

  <!-- פרטי החברה -->
  <h3>פרטי החברה</h3>

  <p><strong>שם החברה:</strong> Trail Quest</p>
  <p><strong>טלפון:</strong> ${data.manager_phone}</p>
  <p><strong>אימייל:</strong> ${data.manager_email}</p>

  <!-- הודעת תודה -->
  <p style="margin-top:20px;font-size:12px;color:#555">
    תודה שבחרתם לטייל איתנו!
  </p>

  </body>
  </html>
  `;
}

/**
 * ----------------------------------------
 * פונקציה ראשית ליצירת חשבונית PDF
 * ----------------------------------------
 */
async function createInvoicePDF(data, VAT_RATE) {

  // יצירת שם קובץ לפי מספר קבוצה
  const fileName = `invoice_${data.group_id}.pdf`;

  // יצירת נתיב מלא לשמירת הקובץ
  const filePath = path.join(invoicesDir, fileName);

  // שלב 1: חישוב כל הסכומים
  const totals = calculateInvoiceTotals(data, VAT_RATE);

  // שלב 2: יצירת HTML מהנתונים ומהחישובים
  const html = generateInvoiceHTML(data, totals);

  // פתיחת דפדפן וירטואלי (Puppeteer)
  const browser = await puppeteer.launch();

  // יצירת עמוד חדש
  const page = await browser.newPage();

  // טעינת ה-HTML לעמוד
  await page.setContent(html);

  // יצירת קובץ PDF
  await page.pdf({
    path: filePath,
    format: "A4",
  });

  // סגירת הדפדפן
  await browser.close();

  // החזרת שם הקובץ שנוצר
  return fileName;
}

module.exports = router;
