/**=================================================================
manageRequests.js
ראוטר לניהול בקשות טיול – כולל אישור/דחייה, ביטולים, יצירת קבוצות, בדיקת זמינות מדריכים ויצירת חשבוניות PDF.
 ===================================================================*/

const express = require("express");
const router = express.Router();

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer");

/**
 * =========================================
 * שליפת שעות פעילות מהמערכת
 * =========================================
 */
function getWorkingHours(callback) {
  const sql = `
    SELECT setting_name, setting_value
    FROM system_settings
    WHERE setting_name IN ('working_hours_start', 'working_hours_end')
  `;

  db.query(sql, (err, rows) => {
    if (err) return callback(err);

    let startMinutes = 8 * 60;
    let endMinutes = 18 * 60;

    rows.forEach((row) => {
      const [h, m] = row.setting_value.split(":").map(Number);
      const total = h * 60 + m;

      if (row.setting_name === "working_hours_start") {
        startMinutes = total;
      }
      if (row.setting_name === "working_hours_end") {
        endMinutes = total;
      }
    });

    callback(null, { startMinutes, endMinutes });
  });
}

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
 * =========================================
 * המרת דקות לפורמט קריא (שעות/דקות)
 * לדוגמה:
 * 180 → "3 שעות"
 * 150 → "2 שעות ו-30 דקות"
 * =========================================
 */
function formatDuration(duration_minutes) {
  const hours = Math.floor(duration_minutes / 60);
  const minutes = duration_minutes % 60;

  if (minutes === 0) return `${hours} שעות`;
  if (hours === 0) return `${minutes} דקות`;

  return `${hours} שעות ו-${minutes} דקות`;
}

/**
 * =========================================
 * המרת דקות לפורמט שעה HH:MM
 * לדוגמה:
 * 90 → "01:30"
 * =========================================
 */
function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * =========================================
 * בדיקת תקינות תאריך ושעה לפי הגדרות מערכת
 * =========================================
 */
function validateTripDateTime(
  trip_date,
  trip_time,
  duration_minutes,
  callback,
) {
  getWorkingHours((err, hours) => {
    if (err) {
      return callback("שגיאה בשליפת שעות מערכת");
    }

    const { startMinutes: START_LIMIT, endMinutes: END_LIMIT } = hours;

    // יצירת תאריך מלא
    const now = new Date();
    const tripDateTime = new Date(`${trip_date}T${trip_time}`);

    //  עבר
    if (tripDateTime < now) {
      return callback("לא ניתן לבחור תאריך/שעה שעברו");
    }

    // פירוק שעה
    const [h, m] = trip_time.split(":").map(Number);

    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + Number(duration_minutes);

    if (startMinutes < START_LIMIT) {
      return callback(
        `שעת התחלה חייבת להיות אחרי ${minutesToTime(START_LIMIT)}`,
      );
    }

    if (endMinutes > END_LIMIT) {
      const endTime = minutesToTime(endMinutes);

      return callback(
        `שעת הסיום (${endTime}) חורגת מהשעה ${minutesToTime(END_LIMIT)}`,
      );
    }

    //  תקין
    return callback(null);
  });
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

/**
 * ------------------------------------------------
 * פונקציה להמרת שעה HH:MM או HH:MM:SS
 * לדקות
 * ------------------------------------------------
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;

  const parts = String(timeStr).split(":");
  const hours = Number(parts[0] || 0);
  const minutes = Number(parts[1] || 0);

  return hours * 60 + minutes;
}

//===============================================
// פונקציה לשליפת זמן הפסקה של מדריך מהגדרות המערכת
//===============================================
function getGuideBreakMinutes(callback) {
  const sql = `
    SELECT setting_value
    FROM system_settings
    WHERE setting_name = 'guide_break_minutes'
    LIMIT 1
  `;

  db.query(sql, (err, rows) => {
    // אם יש שגיאה או שלא נמצא ערך -> ברירת מחדל 30 דקות
    if (err || !rows.length) {
      return callback(30);
    }

    // המרת הערך למספר
    callback(Number(rows[0].setting_value));
  });
}

/**
 * ------------------------------------------------
 * בדיקת חפיפה בין טיולים של מדריך
 * ------------------------------------------------
 *
 * בודק האם למדריך כבר קיימת קבוצה באותו תאריך
 * שהזמן שלה חופף לזמן החדש
 */
function checkGuideAvailability(
  guideId,
  tripDate,
  tripTime,
  durationMinutes,
  ignoreGroupId,
  callback,
) {
  // שליפת זמן הפסקה למדריך מהמערכת
  getGuideBreakMinutes((BUFFER) => {
    // המרת שעת הבקשה לדקות
    const requestedStart = timeToMinutes(tripTime);

    // חישוב שעת סיום הבקשה בדקות
    const requestedEnd = requestedStart + Number(durationMinutes) + BUFFER;

    const sql = `
      SELECT
        g.group_id,
        g.trip_time,
        t.duration_minutes
      FROM groups g
      JOIN trails t
        ON g.trail_id = t.trail_id
      WHERE g.guide_id = ?
        AND DATE(g.trip_date) = DATE(?)
        AND g.status = 'פעיל'
        AND (? IS NULL OR g.group_id <> ?)
    `;

    db.query(
      sql,
      [guideId, tripDate, ignoreGroupId, ignoreGroupId],
      (err, rows) => {
        // אם יש שגיאה מחזירים callback עם שגיאה
        if (err) {
          return callback(err);
        }

        // מעבר על כל הטיולים הקיימים של המדריך
        for (const row of rows) {
          // שעת התחלה של הטיול הקיים בדקות
          const existingStart = timeToMinutes(row.trip_time);

          // שעת סיום של הטיול הקיים בדקות+ ההפסקה
          const existingEnd =
            existingStart + Number(row.duration_minutes || 0) + BUFFER;

          const isBefore = requestedEnd <= existingStart; // האם הטיול החדש מסתיים לפני שהקיים מתחיל
          const isAfter = requestedStart >= existingEnd; // האם הטיול החדש מתחיל אחרי שהקיים מסתיים

          // אם הבקשה לא לפני ולא אחרי -> יש חפיפה
          if (!(isBefore || isAfter)) {
            return callback(null, false);
          }
        }

        // אם לא נמצאה חפיפה -> המדריך פנוי
        return callback(null, true);
      },
    );
  });
}


/**
 * ------------------------------------------------
 * פונקציה שמבצעת את כל החישובים של החשבונית
 * ------------------------------------------------
 */
function calculateInvoice(data, VAT_RATE) {

  // חישוב סכום משתתפים
  const participantsTotal = data.number_of_participants * data.price_per_person;

  // חישוב סכום כלי רכב
  const vehiclesTotal = data.number_of_vehicles * data.price_per_vehicle;

  // סכום לפני מע״מ
  const totalBeforeVat = participantsTotal + vehiclesTotal;

  // חישוב מע״מ
  const vatAmount = totalBeforeVat * VAT_RATE;

  // סכום סופי
  const totalWithVat = totalBeforeVat + vatAmount;

  // החזרת כל הערכים כאובייקט
  return {
    participantsTotal,
    vehiclesTotal,
    totalBeforeVat,
    vatAmount,
    totalWithVat
  };
}

/**
 * ------------------------------------------------
 * פונקציה שמחזירה HTML
 * ------------------------------------------------
 */
function generateInvoiceHTML(data, calc) {

  return `
  <html dir="rtl">
  <head>
  <meta charset="UTF-8">

  <style>
  body{ font-family: Arial; direction: rtl; padding:40px; }
  h1{ text-align:center; }
  table{ width:100%; border-collapse: collapse; margin-top:20px; }
  th,td{ border:1px solid #ccc; padding:10px; text-align:center; }
  .total{ font-weight:bold; background:#f5f5f5; }
  </style>

  </head>

  <body>

  <h1>חשבונית</h1>
  <h3>Trail Quest</h3>

  <p>מספר קבוצה: ${data.group_id}</p>
  <p>מסלול: ${data.trail_name}</p>
  <p>תאריך: ${new Date(data.trip_date).toLocaleDateString("he-IL")}</p>
  <p>שעה: ${data.trip_time}</p>

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
  <td>₪${data.price_per_person}</td>
  <td>₪${calc.participantsTotal.toFixed(2)}</td>
  </tr>

  <tr>
  <td>כלי רכב</td>
  <td>${data.number_of_vehicles}</td>
  <td>₪${data.price_per_vehicle}</td>
  <td>₪${calc.vehiclesTotal.toFixed(2)}</td>
  </tr>

  <tr class="total">
  <td colspan="3">סה"כ לפני מע״מ</td>
  <td>₪${calc.totalBeforeVat.toFixed(2)}</td>
  </tr>

  <tr class="total">
  <td colspan="3">מע״מ</td>
  <td>₪${calc.vatAmount.toFixed(2)}</td>
  </tr>

  <tr class="total">
  <td colspan="3">סה"כ לתשלום</td>
  <td>₪${calc.totalWithVat.toFixed(2)}</td>
  </tr>

  </table>

  <hr style="margin-top:40px">

  <h3>פרטי החברה</h3>
  <p><strong>שם החברה:</strong> Trail Quest</p>
  <p><strong>טלפון:</strong> ${data.manager_phone}</p>
  <p><strong>אימייל:</strong> ${data.manager_email}</p>

  </body>
  </html>
  `;
}

/**
 * ------------------------------------------------
 * פונקציה שיוצרת PDF
 * ------------------------------------------------
 */
async function createInvoicePDF(data, VAT_RATE) {
  // שם קובץ
  const fileName = `invoice_${data.group_id}.pdf`;
  // נתיב
  const filePath = path.join(invoicesDir, fileName);
  // חישובים
  const calc = calculateInvoice(data, VAT_RATE);
  // HTML
  const html = generateInvoiceHTML(data, calc);
  // Puppeteer
  // פתיחת דפדפן Chrome ברקע
  const browser = await puppeteer.launch();
  // יצירת דף חדש
  const page = await browser.newPage();
  // הכנסת ה-HTML לדף
  await page.setContent(html);
  // יצירת קובץ PDF מהדף
  await page.pdf({
    path: filePath, // איפה לשמור את הקובץ
    format: "A4", // גודל הדף
  });
  // סגירת הדפדפן
  await browser.close();

  return fileName;
}


/**
 * ------------------------------------------------
 * GET
 * שליפת כל הבקשות למנהל
 * ------------------------------------------------
 */
router.get("/", (req, res) => {
  const sql = `
  SELECT
  tr.request_id,
  tr.user_id,
  tr.trail_id,
grp.group_id,
  tr.trip_date,
  tr.trip_time,
  tr.guide_id,

  /* הנתונים המקוריים */
  tr.trip_date AS original_trip_date,
  tr.trip_time AS original_trip_time,

  /* הנתונים אחרי שינוי */
  grp.trip_date AS changed_trip_date,
  grp.trip_time AS changed_trip_time,
  grp.guide_id AS changed_guide_id,

  grp.change_reason,
grp.guide_change_reason,

  tr.number_of_participants,
  tr.number_of_vehicles,
  tr.status,
  tr.cancel_requested,
  tr.cancel_reason,
  tr.reject_reason,
  tr.cancel_reject_reason,

  u.full_name AS user_name,
  u.phone AS user_phone,
  u.email AS user_email,

  t.trail_name,
  t.trail_type,
  t.price_per_person,
  t.price_per_vehicle,
  t.duration_minutes,

  g.full_name AS guide_name,
  g.phone AS guide_phone,
  g.email AS guide_email,

  g2.full_name AS changed_guide_name

FROM trip_requests tr

JOIN users u
  ON tr.user_id = u.user_id

JOIN trails t
  ON tr.trail_id = t.trail_id

LEFT JOIN groups grp
  ON tr.request_id = grp.request_id

LEFT JOIN users g
  ON tr.guide_id = g.user_id

LEFT JOIN users g2
  ON grp.guide_id = g2.user_id

ORDER BY 
  CASE 

    /* 1️⃣ קרוב + ממתין או ביטול */
    WHEN 
      TIMESTAMPDIFF(HOUR, NOW(), TIMESTAMP(tr.trip_date, tr.trip_time)) BETWEEN 0 AND 48
      AND (tr.status = 'ממתין' OR tr.cancel_requested = 1)
    THEN 1

    /* 2️⃣ כל ממתין / ביטול (לא משנה זמן) */
    WHEN 
      tr.status = 'ממתין' OR tr.cancel_requested = 1
    THEN 2

    /* 3️⃣ מאושר (תמיד באמצע!) */
    WHEN tr.status = 'מאושר'
    THEN 3

    /* 4️⃣ מבוטל */
    WHEN tr.status = 'מבוטל'
    THEN 4

    /* 5️⃣ נדחה */
    WHEN tr.status = 'נדחה'
    THEN 5

    ELSE 6

  END,

  /* בתוך כל קבוצה – לפי זמן */
  TIMESTAMP(tr.trip_date, tr.trip_time) ASC`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("שגיאה בשליפת הבקשות:", err);
      return res.status(500).json({ message: "שגיאה בשליפת הבקשות" });
    }

    res.json(results);
  });
});

/**
 * ------------------------------------------------
 * GET
 * שליפת מדריכים פנויים לפי זמן
 * ------------------------------------------------
 */
router.get("/available-guides", (req, res) => {
  const { trip_date, trip_time, duration_minutes, ignore_group_id } = req.query;

  if (!trip_date || !trip_time || !duration_minutes) {
    return res.status(400).json({
      message: "חובה לשלוח תאריך, שעה ומשך טיול",
    });
  }

  const sql = `
    SELECT user_id, full_name, phone, email
    FROM users
    WHERE role = 'מדריך'
  `;

  db.query(sql, async (err, guides) => {
    if (err) {
      return res.status(500).json({ message: "שגיאה בשליפת מדריכים" });
    }

    const availableGuides = [];

    let checked = 0;

    for (const guide of guides) {
      checkGuideAvailability(
        guide.user_id,
        trip_date,
        trip_time,
        duration_minutes,
        ignore_group_id || null,
        (err, isAvailable) => {
          checked++;

          if (isAvailable) {
            availableGuides.push(guide);
          }

          if (checked === guides.length) {
            res.json(availableGuides);
          }
        },
      );
    }
  });
});

/**
 * =========================================
 * בדיקת שדות חובה
 * מקבל: body
 * מחזיר: מערך שגיאות
 * =========================================
 */
function validateInput(body) {
  const errors = [];

  if (!body.trip_date) errors.push("חסר תאריך");
  if (!body.trip_time) errors.push("חסרה שעה");
  if (!body.meeting_point?.trim()) errors.push("חסרה נקודת מפגש");
  if (!body.guide_id) errors.push("חסר מדריך");

  return errors;
}


/**
 * =========================================
 * שליפת בקשה מהDB
 * מקבל: requestId
 * מחזיר: בקשה
 * =========================================
 */
function getRequest(requestId, res, cb) {
  const sql = `
    SELECT
      tr.*,
      t.trail_name,
      t.trail_type,
      t.duration_minutes
    FROM trip_requests tr
    JOIN trails t ON tr.trail_id = t.trail_id
    WHERE tr.request_id = ?
    LIMIT 1
  `;

  db.query(sql, [requestId], (err, rows) => {
    if (err) return res.status(500).json({ message: "שגיאה בשליפה" });
    if (!rows.length)
      return res.status(404).json({ message: "הבקשה לא נמצאה" });

    cb(rows[0]);
  });
}

/**
 * =========================================
 * בדיקת שינוי תאריך/שעה/מדריך
 * מקבל: request, body
 * מחזיר: flags
 * מחזיר: מידע על מה השתנה + האם יש שגיאות
 * =========================================
 */
function checkChanges(request, body) {
  const errors = [];

  const oldDate = new Date(request.trip_date).toLocaleDateString("sv-SE");
  const oldTime = String(request.trip_time).slice(0, 5);
  const newTime = String(body.trip_time).slice(0, 5);

  const dateChanged = oldDate !== body.trip_date || oldTime !== newTime;
  const guideChanged = Number(request.guide_id) !== Number(body.guide_id);

  if (dateChanged && !body.change_reason?.trim()) {
    errors.push("חובה סיבה לשינוי תאריך/שעה");
  }

  if (guideChanged && !body.guide_change_reason?.trim()) {
    errors.push("חובה סיבה להחלפת מדריך");
  }

  return { errors, dateChanged, guideChanged };
}


/**
 * =========================================
 * בדיקת זמינות מדריך
 * =========================================
 */
function checkGuide(request, body, res, cb) {
  checkGuideAvailability(
    body.guide_id,
    body.trip_date,
    body.trip_time,
    request.duration_minutes,
    null,
    (err, ok) => {
      if (err) return res.status(500).json({ message: "שגיאה במדריך" });
      if (!ok) return res.status(409).json({ message: "המדריך תפוס" });
      cb();
    }
  );
}


/**
 * =========================================
 * עדכון סטטוס בקשה
 * =========================================
 */
function updateRequest(id, res, cb) {
  db.query(
    "UPDATE trip_requests SET status='מאושר' WHERE request_id=?",
    [id],
    (err) => {
      if (err) return rollback(res, "שגיאה בעדכון בקשה");
      cb();
    }
  );
}


/**
 * =========================================
 * יצירת קבוצה
 * =========================================
 */
function createGroup(request, body, flags, res, cb) {
  const sql = `
    INSERT INTO groups
    (request_id, trail_id, guide_id, trip_date, trip_time, meeting_point, status, change_reason, guide_change_reason)
    VALUES (?, ?, ?, ?, ?, ?, 'פעיל', ?, ?)
  `;

  db.query(sql, [
    request.request_id,
    request.trail_id,
    body.guide_id,
    body.trip_date,
    body.trip_time,
    body.meeting_point.trim(),
    flags.dateChanged ? body.change_reason.trim() : null,
    flags.guideChanged ? body.guide_change_reason.trim() : null
  ], (err, result) => {

    if (err) return rollback(res, "שגיאה ביצירת קבוצה");

    cb(result.insertId);
  });
}


/**
 * =========================================
 * יצירת הדרכה
 * =========================================
 */
function createGuidance(groupId, res, cb) {
  db.query(
    "INSERT INTO guidances (group_id) VALUES (?)",
    [groupId],
    (err) => {
      if (err) return rollback(res, "שגיאה ביצירת הדרכה");
      cb();
    }
  );
}


/**
 * =========================================
 * יצירת חשבונית PDF
// מקבלת בקשה, נתוני טופס, מזהה קבוצה ותגובה; שולפת מדריך ומנהל, מחשבת סכומים ויוצרת חשבונית  ושומרת אותה; לא מחזירה ערך
 * =========================================
 */
function buildInvoice(request, body, groupId, res) {
  db.query(
    `SELECT full_name, phone, email FROM users WHERE user_id=? LIMIT 1`,
    [body.guide_id],
    (err, guideRows) => {
      if (err) return rollback(res, "שגיאה מדריך");

      const guide = guideRows[0] || {};

      db.query(
        `SELECT full_name, phone, email FROM users WHERE role='מנהל' LIMIT 1`,
        (err, managerRows) => {
          if (err) return rollback(res, "שגיאה מנהל");

          const manager = managerRows[0] || {};

          getVatRate(async (err, VAT) => {
            if (err) return rollback(res, "שגיאה מע״מ");

            try {
         
              const participants = Number(request.number_of_participants || 0);
              const vehicles = Number(request.number_of_vehicles || 0);
           const pricePerPerson = Number(request.booking_price_per_person || 0);
           const pricePerVehicle = Number(request.booking_price_per_vehicle || 0);

              const participantsTotal = participants * pricePerPerson;
              const vehiclesTotal = vehicles * pricePerVehicle;
              const totalBeforeVat = participantsTotal + vehiclesTotal;
              const vatAmount = totalBeforeVat * VAT;
              const totalWithVat = totalBeforeVat + vatAmount;

            
              const file = await createInvoicePDF(
                {
                  group_id: groupId,

                  trail_name: request.trail_name,

                  trip_date: body.trip_date,
                  trip_time: body.trip_time,
                  meeting_point: body.meeting_point,

                  guide_name: guide.full_name,
                  guide_phone: guide.phone,
                  guide_email: guide.email,

            
                  number_of_participants: participants,
                  number_of_vehicles: vehicles,
                  price_per_person: pricePerPerson,
                  price_per_vehicle: pricePerVehicle,

                  manager_name: manager.full_name,
                  manager_phone: manager.phone,
                  manager_email: manager.email,
                },
                VAT,
              );

              saveInvoice(groupId, file, res, request.request_id, VAT);
            } catch (error) {
              console.error(error);
              rollback(res, "שגיאה ביצירת PDF");
            }
          });
        },
      );
    },
  );
}

/**
 * =========================================
 * שמירת חשבונית
 * =========================================
 */
function saveInvoice(groupId, file, res, requestId, VAT) {
  db.query(
    "UPDATE groups SET invoice_file=? WHERE group_id=?",
    [file, groupId],
    (err) => {
      if (err) return rollback(res, "שגיאה בשמירת חשבונית");

      db.query(
        "UPDATE trip_requests SET booking_vat_rate=? WHERE request_id=?",
        [VAT * 100, requestId],
        (err) => {
          if (err) return rollback(res, "שגיאה בשמירת המע״מ");

          db.commit(() => {
            res.json({
              message: "הבקשה אושרה בהצלחה",
              group_id: groupId,
              invoice_file: file,
            });
          });
        },
      );
    },
  );
}


/**
 * =========================================
 * ביטול טרנזקציה במקרה שגיאה
 * =========================================
 */
function rollback(res, msg) {
  db.rollback(() => res.status(500).json({ message: msg }));
}


/**
 * =========================================
 * תהליך אישור מלא
 * =========================================
 */
function processApproval(request, body, flags, res) {

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ message: "שגיאה בטרנזקציה" });

    updateRequest(request.request_id, res, () => {

      createGroup(request, body, flags, res, (groupId) => {

        createGuidance(groupId, res, () => {

          buildInvoice(request, body, groupId, res);

        });

      });

    });

  });
}


/**
 * =========================================
 * הראוטר הראשי
 * * PUT
 * אישור בקשה + יצירת קבוצה + יצירת חשבונית
 * =========================================
 */
router.put("/approve/:requestId", (req, res) => {

  const errors = validateInput(req.body);
  
     if (errors.length > 0) {
       return res.status(400).json({ errors });
     }

  getRequest(req.params.requestId, res, (request) => {

    validateTripDateTime(
      req.body.trip_date,
      req.body.trip_time,
      request.duration_minutes,
      (error) => {

        if (error) {
          return res.status(400).json({ errors: [error] });
        }

        if (request.status !== "ממתין") {
          return res.status(400).json({
            errors: ["ניתן לאשר רק בקשה במצב ממתין"]
          });
        }

        const change = checkChanges(request, req.body);

        if (change.errors.length > 0) {
          return res.status(400).json({ errors: change.errors });
        }

        checkGuide(request, req.body, res, () => {
          processApproval(request, req.body, change, res);
        });

      }
    );

  });

});

/**
 * ------------------------------------------------
 * PUT
 * דחיית בקשה
 * ------------------------------------------------
 *
 * חייבים לשלוח סיבת דחייה
 */
router.put("/reject/:requestId", (req, res) => {
  const requestId = req.params.requestId;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      message: "חובה לכתוב סיבת דחייה",
    });
  }

  const sql = `
    UPDATE trip_requests
    SET
      status = 'נדחה',
      reject_reason = ?
    WHERE request_id = ?
  `;

  db.query(sql, [reason.trim(), requestId], (err) => {
    if (err) {
      console.error("שגיאה בדחיית בקשה:", err);
      return res.status(500).json({ message: "שגיאה בדחיית הבקשה" });
    }

    res.json({
      message: "הבקשה נדחתה בהצלחה",
    });
  });
});


/**------------------------------------------------------------
 * מקבלת requestId, מעדכנת בקשה ל"מבוטל"
 -----------------------------------------------------------------*/
function updateRequestStatus(requestId, callback) {
  const updateRequestSql = `
    UPDATE trip_requests
    SET status = 'מבוטל', cancel_requested = 0
    WHERE request_id = ?
  `;

  db.query(updateRequestSql, [requestId], callback);
}

/**------------------------------------------------------------
 * מקבלת requestId, מעדכנת קבוצה ל"בוטל"
 ------------------------------------------------------------*/
function updateGroupStatus(requestId, callback) {
  const updateGroupSql = `
    UPDATE groups
    SET status = 'בוטל'
    WHERE request_id = ?
  `;

  db.query(updateGroupSql, [requestId], callback);
}

/**----------------------------------------------------
 * מקבלת requestId, מעדכנת הדרכות ל"בוטל"
 -----------------------------------------------------------*/
function updateGuidanceStatus(requestId, callback) {
  const updateGuidanceSql = `
    UPDATE guidances
    SET status = 'בוטל'
    WHERE group_id IN (
      SELECT group_id FROM groups WHERE request_id = ?
    )
  `;

  db.query(updateGuidanceSql, [requestId], callback);
}

/**----------------------------------------------------------
 * מנהלת את כל תהליך הביטול
 ------------------------------------------------------------*/
function handleApproveCancel(requestId, req, res) {
  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: "שגיאה בפתיחת טרנזקציה" });
    }

    updateRequestStatus(requestId, (err) => {
      if (err) {
        return db.rollback(() => {
          res.status(500).json({ message: "שגיאה באישור הביטול" });
        });
      }

      updateGroupStatus(requestId, (err) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ message: "שגיאה בעדכון קבוצה" });
          });
        }

        updateGuidanceStatus(requestId, (err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ message: "שגיאה בעדכון הדרכה" });
            });
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ message: "שגיאה בשמירת הנתונים" });
              });
            }

            res.json({
              message: "בקשת הביטול אושרה והקבוצה בוטלה בהצלחה",
            });
          });
        });
      });
    });
  });
}


/**
 * ------------------------------------------------
 * PUT
 * אישור ביטול בקשה
 * ------------------------------------------------
 *
 * משנה:
 * - את הבקשה ל"מבוטל"
 * - את הקבוצה ל"מבוטל"
 * את ההדרכה ל בוטל
 */
router.put("/approveCancel/:requestId", (req, res) => {
  const requestId = req.params.requestId;
  handleApproveCancel(requestId, req, res);
});


/**
 * מקבלת מזהה בקשה, מחזירה בקשה 
 */
function fetchRequestById(requestId, cb) {
  const sql = `
    SELECT
      tr.*,
      t.trail_name,
      t.trail_type,
      t.duration_minutes
    FROM trip_requests tr
    JOIN trails t ON tr.trail_id = t.trail_id
    WHERE tr.request_id = ?
    LIMIT 1
  `;

  db.query(sql, [requestId], (e, r) => cb(e, r?.[0]));
}

/**
 * מקבלת requestId, בודקת אם יש קבוצה
 */
function checkGroup(requestId, cb) {
  db.query(
    `SELECT group_id FROM groups WHERE request_id=? LIMIT 1`,
    [requestId],
    (e, r) => cb(e, r?.length)
  );
}

/**
 * מעדכן בקשה + קבוצה למצב פעיל
 */
function restoreGroup(requestId, reason, res) {
  db.query(
    `UPDATE trip_requests SET status='מאושר', cancel_requested=0, cancel_reject_reason=? WHERE request_id=?`,
    [reason, requestId],
    (e) => {
      if (e) return res.status(500).json({ message: "שגיאה בבקשה" });

      db.query(
        `UPDATE groups SET status='פעיל' WHERE request_id=?`,
        [requestId],
        (e) => {
          if (e) return res.status(500).json({ message: "שגיאה בקבוצה" });
          res.json({ message: "הקבוצה חזרה לפעיל" });
        }
      );
    }
  );
}

/**----------------------------------------------------------------------------
 * בדיקות חובה לפני יצירת קבוצה
 * מקבלת: body, res
 * בודקת: שיש תאריך, שעה, נקודת מפגש ומדריך
 * מחזירה: אמת אם תקין, אחרת שולחת שגיאה מתאחמה ומחזירה שקר
 --------------------------------------------------------------------------*/
function validateInputs(body, res) {
  const { trip_date, trip_time, meeting_point, guide_id } = body;

  const errors = [];

  if (!trip_date) errors.push("חסר תאריך");
  if (!trip_time) errors.push("חסרה שעה");
  if (!meeting_point) errors.push("חסרה נקודת מפגש");
  if (!guide_id) errors.push("חסר מדריך");

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  return true;
}

/**------------------------------------
 * יוצר קבוצה חדשה
 ----------------------------------------*/
function insertGroup(request, body, cb) {
  const sql = `
    INSERT INTO groups
    (request_id, trail_id, guide_id, trip_date, trip_time, meeting_point, status)
    VALUES (?, ?, ?, ?, ?, ?, 'פעיל')
  `;

  db.query(
    sql,
    [
      request.request_id,
      request.trail_id,
      body.guide_id,
      body.trip_date,
      body.trip_time,
      body.meeting_point.trim(),
    ],
    (e, r) => cb(e, r?.insertId),
  );
}

/**---------------------------------------
 * יוצר הדרכה
-------------------------------------------- */
function insertGuidanceToDB(groupId, cb) {
  db.query(`INSERT INTO guidances (group_id) VALUES (?)`, [groupId], cb);
}

/**
 * ------------------------------------------------
 * PUT
 * דחיית ביטול בקשה
 * ------------------------------------------------
 *
 * מצבים אפשריים:
 *
 * 1️⃣ אם הבקשה הייתה ממתינה ואין קבוצה
 *    → יוצרים קבוצה + יוצרים חשבונית
 *
 * 2️⃣ אם כבר קיימת קבוצה
 *    → מחזירים את הקבוצה לסטטוס פעיל
 */
router.put("/rejectCancel/:requestId", (req, res) => {
  const id = req.params.requestId;
  const { reason } = req.body;

  // בדיקת חובה לסיבה
  if (!reason?.trim()) {
    return res.status(400).json({ message: "חובה סיבה" });
  }

  // שליפת הבקשה מהDB
  fetchRequestById(id, (err, request) => {
    if (err || !request) {
      return res.status(500).json({ message: "שגיאה בבקשה" });
    }

    // בדיקה אם כבר קיימת קבוצה
    checkGroup(id, (err, hasGroup) => {
      if (err) return res.status(500).json({ message: "שגיאה קבוצה" });

      // מצב 1: יש קבוצה → מחזירים לפעיל
      if (hasGroup) return restoreGroup(id, reason.trim(), res);

      // מצב 2: אין קבוצה → חייבים נתונים ליצירה
      if (!validateInputs(req.body, res)) return;

      // התחלת טרנזקציה ליצירה בטוחה
      db.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: "שגיאה בגישה למסד הנתונים" });

        // עדכון הבקשה חזרה למאושר
        db.query(
          `UPDATE trip_requests SET status='מאושר', cancel_requested=0, cancel_reject_reason=? WHERE request_id=?`,
          [reason.trim(), id],
          (err) => {
            if (err) return db.rollback(() => res.status(500).json({}));

            // יצירת קבוצה חדשה
            insertGroup(request, req.body, (err, groupId) => {
              if (err) return db.rollback(() => res.status(500).json({}));

              // יצירת הדרכה לקבוצה
              insertGuidanceToDB(groupId, (err) => {
                if (err) return db.rollback(() => res.status(500).json({}));

                //  יצירת חשבונית 
                buildInvoice(request, req.body, groupId, res);
              });
            });
          },
        );
      });
    });
  });
});




module.exports = router;
