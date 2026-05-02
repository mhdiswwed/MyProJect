/*/=================================
manageGuidances.js
ראוטר לניהול הדרכות – שליפת הדרכות, בדיקת זמינות מדריכים, החלפת מדריך, ביטול הדרכה ויצירת חשבוניות PDF כולל חישובי מחירים ומע״מ
//=================================*/

const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");

// Execute a query to the database
const db = dbSingleton.getConnection();

const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer");

//========================================
// שליפת זמן הפסקה של מדריך מהמערכת (בדקות)
//========================================
function getGuideBreakMinutes(callback) {
  const sql = `
    SELECT setting_value
    FROM system_settings
    WHERE setting_name = 'guide_break_minutes'
    LIMIT 1
  `;

  db.query(sql, (err, rows) => {
    if (err) return callback(err);

    if (!rows.length) {
      return callback(null, 30); // ברירת מחדל 30 דקות
    }

    callback(null, Number(rows[0].setting_value));
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

/* =====================================================
   שליפת כל ההדרכות
===================================================== */
router.get("/", (req, res) => {
  const sql = `
  SELECT
g.group_id,
g.trip_date,
g.trip_time,

g.cancel_reason,

gd.status,

-- זמן התחלה וסיום בפועל
gd.start_time,
gd.end_time,

-- הערות
gd.notes,

-- תמונה (שינוי שם ל- image)
gd.images AS image,

-- משך המסלול (תכנון)
t.duration_minutes,

t.trail_name,
u.full_name AS guide_name,
u.phone AS guide_phone,
u.email AS guide_email

FROM groups g

JOIN guidances gd ON g.group_id = gd.group_id
JOIN trails t ON g.trail_id = t.trail_id
JOIN users u ON g.guide_id = u.user_id

ORDER BY
  -- סדר סטטוסים
  CASE gd.status
    WHEN 'בתהליך' THEN 1
    WHEN 'מתוכנן' THEN 2
    WHEN 'הסתיים' THEN 3
    WHEN 'בוטל' THEN 4
  END,

  -- בתהליך + מתוכנן → תאריך מוקדם ואז שעה מוקדמת
  CASE 
    WHEN gd.status IN ('בתהליך','מתוכנן') THEN g.trip_date
  END ASC,

  CASE 
    WHEN gd.status IN ('בתהליך','מתוכנן') THEN g.trip_time
  END ASC,

  -- הסתיים + בוטל → תאריך מאוחר ואז שעה מאוחרת
  CASE 
    WHEN gd.status IN ('הסתיים','בוטל') THEN g.trip_date
  END DESC,

  CASE 
    WHEN gd.status IN ('הסתיים','בוטל') THEN g.trip_time
  END DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("שגיאה בשליפת הדרכות:", err);
      return res.status(500).json({ message: "שגיאה בשרת" });
    }

    res.json(results);
  });
});


/**
 * ==========================
 * GET
 * שליפת מדריכים פנויים
 * ==========================
 *
 * מחזיר רשימת מדריכים פנויים לפי תאריך ושעה
 */
router.get("/available-guides", (req, res) => {
  const { date, time, group_id } = req.query;

  if (!date || !time || !group_id) {
    return res.status(400).json({ message: "חסר נתונים" });
  }

  const cleanDate = new Date(date).toLocaleDateString("en-CA");

  getDuration(group_id, res, (duration) => {
    getGuideBreakMinutes((err, breakMinutes) => {
      if (err) {
        return res.status(500).json({ message: "שגיאה במסד הנתונים" });
      }

      const times = buildTimeRange(cleanDate, time, duration);

      getAllGuides(res, (guides) => {
        checkGuidesAvailability(
          guides,
          cleanDate,
          group_id,
          times,
          breakMinutes,
          res
        );
      });
    });
  });
});

/**
 * מקבלת: group_id, res, callback
 * עושה: מביאה משך זמן מסלול
 * מחזירה: duration
 */
function getDuration(group_id, res, cb) {
  const sql = `
    SELECT t.duration_minutes
    FROM groups g
    JOIN trails t ON g.trail_id = t.trail_id
    WHERE g.group_id = ?
  `;

  db.query(sql, [group_id], (err, rows) => {
    if (err || !rows.length) {
      return res.status(500).json({ message: "שגיאה במסד הנתונים" });
    }
    cb(rows[0].duration_minutes);
  });
}

/**
 * מקבלת: date, time, duration
 * עושה: בונה זמן התחלה וסיום
 * מחזירה: start + end
 */
function buildTimeRange(date, time, duration) {
  const [h, m] = time.split(":");

  const start = new Date(date);
  start.setHours(h, m, 0, 0);

  const end = new Date(start.getTime() + duration * 60000);

  return { start, end };
}

/**
 * מקבלת: res, callback
 * עושה: מביאה את כל המדריכים
 * מחזירה: מערך מדריכים
 */
function getAllGuides(res, cb) {
  db.query(
    `SELECT user_id, full_name FROM users WHERE role='מדריך'`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "שגיאה במסד הנתונים" });
      }
      cb(rows);
    }
  );
}

/**
 * מקבלת: guides, date, group_id, times, breakMinutes, res
 * עושה: בודקת מי פנוי
 * מחזירה: רשימת מדריכים פנויים
 */
function checkGuidesAvailability(
  guides,
  date,
  group_id,
  times,
  breakMinutes,
  res
) {
  const available = [];
  let checked = 0;

  guides.forEach((guide) => {
    getGuideTrips(guide.user_id, date, group_id, (trips) => {
      if (isGuideFree(trips, times, breakMinutes, date)) {
        available.push(guide);
      }

      checked++;
      if (checked === guides.length) {
        res.json(available);
      }
    });
  });
}

/**
 * מקבלת: guide_id, date, group_id, callback
 * עושה: מביאה את כל ההדרכות של מדריך
 * מחזירה: trips
 */
function getGuideTrips(guideId, date, group_id, cb) {
  const sql = `
    SELECT g.trip_time, t.duration_minutes
    FROM groups g
    JOIN trails t ON g.trail_id = t.trail_id
    WHERE g.guide_id = ?
    AND DATE(g.trip_date) = ?
    AND g.status != 'בוטל'
    AND g.group_id <> ?
  `;

  db.query(sql, [guideId, date, group_id], (err, rows) => {
    if (err) return cb([]);
    cb(rows);
  });
}

/**
 * מקבלת: trips, times, breakMinutes, date
 * עושה: בודקת חפיפות זמן
 * מחזירה: true אם פנוי
 */
function isGuideFree(trips, times, breakMinutes, date) {
  const buffer = breakMinutes * 60000;

  for (let trip of trips) {
    const [h, m] = trip.trip_time.split(":");

    const start = new Date(date);
    start.setHours(h, m, 0, 0);

    const end = new Date(
      start.getTime() + trip.duration_minutes * 60000
    );

    const endWithBuffer = new Date(end.getTime() + buffer);
    const reqEndWithBuffer = new Date(times.end.getTime() + buffer);

    const before = reqEndWithBuffer <= start;
    const after = times.start >= endWithBuffer;

    if (!(before || after)) {
      return false;
    }
  }

  return true;
}

//==========================
// ביטול קבוצה (הדרכה)
//==========================
// ביטול הדרכה + עדכון כל המערכת
router.put("/cancel/:groupId", (req, res) => {
  const { groupId } = req.params;
  const { reason } = req.body;

  // עדכון קבוצה
  db.query(
    `UPDATE groups 
     SET status = 'בוטל', cancel_reason = ?
     WHERE group_id = ?`,
    [reason, groupId],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "שגיאה בקבוצה" });
      }

      // עדכון הדרכה
      db.query(
        `UPDATE guidances 
         SET status = 'בוטל'
         WHERE group_id = ?`,
        [groupId],
        (err2) => {
          if (err2) {
            return res.status(500).json({ message: "שגיאה בהדרכה" });
          }

          // עדכון בקשה
          db.query(
            `UPDATE trip_requests 
             SET status = 'מבוטל'
             WHERE request_id = (
               SELECT request_id FROM groups WHERE group_id = ?
             )`,
            [groupId],
            (err3) => {
              if (err3) {
                return res.status(500).json({ message: "שגיאה בבקשה" });
              }

              // הצלחה
              res.json({ message: "ההדרכה בוטלה בכל המערכת" });
            },
          );
        },
      );
    },
  );
});


/**
 * ------------------------------------------------
 * PUT
 * החלפת מדריך
 * ------------------------------------------------
 *
 * מעדכן מדריך ויוצר חשבונית חדשה
 */
router.put("/change-guide/:group_id", (req, res) => {
  const { group_id } = req.params;
  const { guide_id, reason } = req.body;

  if (!guide_id || !reason) {
    return res.status(400).json({
      message: "חובה לבחור מדריך ולכתוב סיבה",
    });
  }

  updateGuide(group_id, guide_id, reason, res);
});

/**
 * מקבלת: group_id, guide_id, reason, res
 * עושה: מעדכנת מדריך בקבוצה
 * מחזירה: ממשיכה לתהליך חשבונית
 */
function updateGuide(group_id, guide_id, reason, res) {
  const sql = `
    UPDATE groups
    SET guide_id = ?, guide_change_reason = ?
    WHERE group_id = ?
  `;

  db.query(sql, [guide_id, reason, group_id], (err) => {
    if (err) {
      return res.status(500).json({ message: "שגיאה במסד הנתונים" });
    }

    updateInvoice(group_id, res);
  });
}

/**
 * מקבלת: group_id, res
 * עושה: מוחקת חשבונית ישנה
 * מחזירה: ממשיכה לשליפת נתונים
 */
async function updateInvoice(group_id, res) {
  try {
    await db
      .promise()
      .query("UPDATE groups SET invoice_file = NULL WHERE group_id = ?", [
        group_id,
      ]);

    getGroupData(group_id, res);
  } catch (err) {
    res.status(500).json({ message: "שגיאה במסד הנתונים" });
  }
}

/**
 * מקבלת: group_id, res
 * עושה: שולפת נתוני קבוצה
 * מחזירה: groupData
 */
async function getGroupData(group_id, res) {
  try {
    const [rows] = await db.promise().query(getGroupSql, [group_id]);
    createNewInvoice(rows[0], group_id, res);
  } catch (err) {
    res.status(500).json({ message: "שגיאה במסד הנתונים" });
  }
}

/**
 * מקבלת: groupData, group_id, res
 * עושה: מחשבת מחירים ומע״מ
 * מחזירה: ממשיכה ליצירת PDF
 */
function createNewInvoice(groupData, group_id, res) {
  getVatRate(async (err, vatRate) => {
    if (err) {
      return res.status(500).json({ message: "שגיאה במסד הנתונים" });
    }

    const prices = calculatePrices(groupData, vatRate);

    try {
      const fileName = await createInvoicePDF(
        { ...groupData, ...prices },
        vatRate
      );

      saveInvoice(group_id, fileName, res);
    } catch (error) {
      res.status(500).json({ message: "שגיאה ביצירת חשבונית" });
    }
  });
}


/**-------------------------------------------
 * מקבלת: group_id, fileName, res
 * עושה: שומרת חשבונית חדשה
 * מחזירה: תשובה ללקוח
 ----------------------------------------------*/
async function saveInvoice(group_id, fileName, res) {
  try {
    await db
      .promise()
      .query("UPDATE groups SET invoice_file = ? WHERE group_id = ?", [
        fileName,
        group_id,
      ]);

    res.json({ message: "המדריך הוחלף + חשבונית עודכנה" });
  } catch (err) {
    res.status(500).json({ message: "שגיאה במסד הנתונים" });
  }
}



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
  // יצירת שם קובץ לפי מזהה קבוצה
  const fileName = `invoice_${data.group_id}.pdf`;

  // יצירת נתיב לשמירת הקובץ
  const filePath = path.join(invoicesDir, fileName);

  // חישוב מחירים (משתתפים, רכבים, מע״מ וכו')
  const prices = calculatePrices(data, VAT_RATE);

  // יצירת HTML של החשבונית
  const html = buildHTML(data, prices, VAT_RATE);

  // יצירת קובץ PDF מה-HTML
  await generatePDF(html, filePath);

  // החזרת שם הקובץ שנוצר
  return fileName;
}

/**----------------------------------------
 * מקבלת: data, VAT_RATE
 * עושה: מחשבת מחירים
 * מחזירה: אובייקט מחירים
 -------------------------------------------*/
function calculatePrices(data, VAT_RATE) {
  const participantsTotal =
    Number(data.number_of_participants || 0) *
    Number(data.price_per_person || 0);

  const vehiclesTotal =
    Number(data.number_of_vehicles || 0) *
    Number(data.price_per_vehicle || 0);

  const totalBeforeVat = participantsTotal + vehiclesTotal;
  const vatAmount = totalBeforeVat * VAT_RATE;
  const totalWithVat = totalBeforeVat + vatAmount;

  return {
    participantsTotal,
    vehiclesTotal,
    totalBeforeVat,
    vatAmount,
    totalWithVat,
  };
}

/**-------------------------------------------------
 * מקבלת: data, prices, VAT_RATE
 * עושה: בונה HTML לחשבונית
 * מחזירה: מחרוזת HTML
 ---------------------------------------------------*/
function buildHTML(data, p, VAT_RATE) {
  return `
  <html dir="rtl">
  <head>
  <meta charset="UTF-8">
  <style>
  body{font-family:Arial;direction:rtl;padding:40px;}
  h1{text-align:center;}
  table{width:100%;border-collapse: collapse;margin-top:20px;}
  th,td{border:1px solid #ccc;padding:10px;text-align:center;}
  .total{font-weight:bold;background:#f5f5f5;}
  </style>
  </head>

  <body>

  <h1>חשבונית</h1>

  <h3>Trail Quest</h3>

  <p>מספר קבוצה: ${data.group_id}</p>
  <p>מסלול: ${data.trail_name}</p>
  <p>תאריך: ${new Date(data.trip_date).toLocaleDateString("he-IL")}</p>
  <p>שעה: ${data.trip_time?.slice(0, 5)}</p>

  <h3>פרטי מדריך</h3>

  <p>שם: ${data.guide_name}</p>
  <p>טלפון: ${data.guide_phone}</p>
  <p>אימייל: ${data.guide_email}</p>

  <table>

  <tr>
  <th>תיאור</th>
  <th>כמות</th>
  <th>מחיר</th>
  <th>סה"כ</th>
  </tr>

  <tr>
  <td>משתתפים</td>
  <td>${data.number_of_participants}</td>
  <td>₪${Number(data.price_per_person || 0)}</td>
  <td>₪${p.participantsTotal.toFixed(2)}</td>
  </tr>

  <tr>
  <td>כלי רכב</td>
  <td>${data.number_of_vehicles}</td>
  <td>₪${Number(data.price_per_vehicle || 0)}</td>
  <td>₪${p.vehiclesTotal.toFixed(2)}</td>
  </tr>

  <tr class="total">
  <td colspan="3">סה"כ לפני מע״מ</td>
  <td>₪${p.totalBeforeVat.toFixed(2)}</td>
  </tr>

  <tr class="total">
  <td colspan="3">מע״מ</td>
  <td>₪${p.vatAmount.toFixed(2)}</td>
  </tr>

  <tr class="total">
  <td colspan="3">סה"כ לתשלום</td>
  <td>₪${p.totalWithVat.toFixed(2)}</td>
  </tr>

  </table>

  <hr style="margin-top:40px">

  <h3>פרטי החברה</h3>

  <p><strong>שם החברה:</strong> Trail Quest</p>
  <p><strong>טלפון:</strong> ${data.manager_phone}</p>
  <p><strong>אימייל:</strong> ${data.manager_email}</p>

  <p style="margin-top:20px;font-size:12px;color:#555">
  תודה שבחרתם לטייל איתנו!
  </p>

  </body>
  </html>
  `;
}

/**------------------------------------------------
 * מקבלת: html, filePath
 * עושה: יוצרת PDF
 * מחזירה: אין
 ---------------------------------------*/
async function generatePDF(html, filePath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html);

  await page.pdf({
    path: filePath,
    format: "A4",
  });

  await browser.close();
}


module.exports = router;
