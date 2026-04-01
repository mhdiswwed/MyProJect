/**
 * routes/manageRequests.js
 * ------------------------------------------------
 * ראוטר מלא לניהול בקשות טיול על ידי מנהל
 *
 * כולל:
 * - שליפת כל הבקשות
 * - אישור בקשה + יצירת קבוצה + יצירת חשבונית PDF
 * - דחיית בקשה עם סיבה
 * - אישור ביטול
 * - דחיית ביטול עם סיבה
 * - שינוי מדריך עם סיבה
 * - בדיקת זמינות מדריך
 */

const express = require("express");
const router = express.Router();

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer");

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
 * בדיקת תקינות תאריך ושעה לטיול
 *
 * בודק:
 * - לא תאריך/שעה בעבר
 * - התחלה בין 08:00 ל-18:00
 * - סיום לא עובר את 18:00 לפי משך המסלול
 *
 * מחזיר:
 * - null אם תקין
 * - הודעת שגיאה אם לא תקין
 * =========================================
 */
function validateTripDateTime(trip_date, trip_time, duration_minutes) {
  const now = new Date();
  const tripDateTime = new Date(`${trip_date}T${trip_time}`);

  // ❌ תאריך בעבר
  if (tripDateTime < now) {
    return "לא ניתן לבחור תאריך/שעה שכבר עברו";
  }

  const [hours, minutes] = trip_time.split(":").map(Number);

  // ❌ לפני 08:00
  if (hours < 8) {
    return "שעת התחלה חייבת להיות אחרי 08:00";
  }

  // ❌ אחרי 18:00
  if (hours >= 18) {
    return "שעת התחלה חייבת להיות לפני 18:00";
  }

  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + Number(duration_minutes);

  const END_LIMIT = 18 * 60; // 18:00

  // ❌ חורג משעות פעילות
  if (endMinutes > END_LIMIT) {
    const endTime = minutesToTime(endMinutes);

    return `הטיול נמשך ${formatDuration(duration_minutes)} ולכן מסתיים ב־${endTime} — חורג משעות הפעילות (עד 18:00)`;
  }

  return null; // ✅ תקין
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
  const requestedStart = timeToMinutes(tripTime);

  /* מוסיפים 30 דקות זמן מעבר בין טיולים */
  const BUFFER_MINUTES = 30;
  const requestedEnd =
    requestedStart + Number(durationMinutes) + BUFFER_MINUTES;

  const sql = `
  SELECT
    g.group_id,
    g.trip_time,
    t.duration_minutes
  FROM groups g
  JOIN trails t
    ON g.trail_id = t.trail_id
  WHERE g.guide_id = ?
    AND DATE(g.trip_date) = DATE(?)   -- 🔥 תיקון כאן
    AND g.status = 'פעיל'
    AND (? IS NULL OR g.group_id <> ?)
`;

  db.query(
    sql,
    [guideId, tripDate, ignoreGroupId, ignoreGroupId],
    (err, rows) => {
      if (err) {
        return callback(err);
      }

      for (const row of rows) {
        const existingStart = timeToMinutes(row.trip_time);
        const existingEnd =
          existingStart + Number(row.duration_minutes || 0) + BUFFER_MINUTES;

        const overlap =
          requestedStart < existingEnd && existingStart < requestedEnd;

        if (overlap) {
          return callback(null, false);
        }
      }

      callback(null, true);
    },
  );
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
  /* יצירת שם קובץ לחשבונית */
  const fileName = `invoice_${data.group_id}.pdf`;

  /* נתיב שמירת הקובץ בתיקיית החשבוניות */
  const filePath = path.join(invoicesDir, fileName);

  /**
   * חישובי מחירים
   * סכום משתתפים
   */
  const participantsTotal = data.number_of_participants * data.price_per_person;

  /**
   * סכום כלי רכב
   */
  const vehiclesTotal = data.number_of_vehicles * data.price_per_vehicle;

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
  <p>שעה: ${data.trip_time}</p>

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
  <td>₪${data.price_per_person}</td>
  <td>₪${participantsTotal.toFixed(2)}</td>
  </tr>

  <!-- שורת כלי רכב -->
  <tr>
  <td>כלי רכב</td>
  <td>${data.number_of_vehicles}</td>
  <td>₪${data.price_per_vehicle}</td>
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
 * ------------------------------------------------
 * PUT
 * אישור בקשה + יצירת קבוצה + יצירת חשבונית
 * ------------------------------------------------
 *
 * מהפרונט חייבים להישלח:
 * - trip_date
 * - trip_time
 * - meeting_point
 * - guide_id
 * - change_reason (רק אם שונה תאריך / שעה / מדריך)
 */
router.put("/approve/:requestId", (req, res) => {
  const requestId = req.params.requestId;

  const {
    trip_date,
    trip_time,
    meeting_point,
    guide_id,
    change_reason,
    guide_change_reason,
  } = req.body;

  if (!trip_date || !trip_time || !meeting_point || !guide_id) {
    return res.status(400).json({
      message: "חובה לשלוח תאריך, שעה, נקודת מפגש ומדריך",
    });
  }

  /**
   * שליפת הבקשה המקורית
   */
  const requestSql = `
    SELECT
      tr.request_id,
      tr.user_id,
      tr.trail_id,
      tr.guide_id,
      tr.trip_date,
      tr.trip_time,
      tr.number_of_participants,
      tr.number_of_vehicles,
      tr.status,

      t.trail_name,
      t.price_per_person,
      t.price_per_vehicle,
      t.duration_minutes
    FROM trip_requests tr
    JOIN trails t
      ON tr.trail_id = t.trail_id
    WHERE tr.request_id = ?
    LIMIT 1
  `;

  db.query(requestSql, [requestId], (err, requestRows) => {
    if (err) {
      console.error("שגיאה בשליפת הבקשה:", err);
      return res.status(500).json({ message: "שגיאה בשליפת הבקשה" });
    }

    if (!requestRows.length) {
      return res.status(404).json({ message: "הבקשה לא נמצאה" });
    }

    const request = requestRows[0];
    // בדיקת תאריך ושעה
    const error = validateTripDateTime(
      trip_date,
      trip_time,
      request.duration_minutes,
    );

    if (error) {
      return res.status(400).json({ message: error });
    }

    /**
     * מותר לאשר רק בקשה שממתינה
     */
    if (request.status !== "ממתין") {
      return res.status(400).json({
        message: "ניתן לאשר רק בקשה במצב ממתין",
      });
    }

    /**
     * בדיקה אם המנהל שינה משהו
     */

    const originalDate = new Date(request.trip_date).toLocaleDateString(
      "sv-SE",
    );
    const newDate = trip_date;

    const originalTime = String(request.trip_time).slice(0, 5);
    const newTime = String(trip_time).slice(0, 5);

    const originalGuideId = Number(request.guide_id || 0);
    const newGuideId = Number(guide_id);

    const dateOrTimeChanged =
      originalDate !== newDate || originalTime !== newTime;

    const guideChanged = originalGuideId !== newGuideId;

    // בדיקה לתאריך/שעה
    if (dateOrTimeChanged && (!change_reason || !change_reason.trim())) {
      return res.status(400).json({
        message: "חובה לכתוב סיבה לשינוי תאריך או שעה",
      });
    }

    // בדיקה למדריך
    if (guideChanged && (!guide_change_reason || !guide_change_reason.trim())) {
      return res.status(400).json({
        message: "חובה לכתוב סיבה להחלפת מדריך",
      });
    }

    /**
     * בדיקת זמינות מדריך
     */
    checkGuideAvailability(
      newGuideId,
      trip_date,
      trip_time,
      request.duration_minutes,
      null,
      (err, isAvailable) => {
        if (err) {
          console.error("שגיאה בבדיקת זמינות מדריך:", err);
          return res.status(500).json({ message: "שגיאה בבדיקת זמינות מדריך" });
        }

        if (!isAvailable) {
          return res.status(409).json({
            message: "המדריך כבר משובץ לטיול אחר בזמן זה",
          });
        }

        /**
         * מתחילים טרנזקציה
         */
        db.beginTransaction((err) => {
          if (err) {
            console.error("שגיאה בפתיחת טרנזקציה:", err);
            return res.status(500).json({ message: "שגיאה בפתיחת טרנזקציה" });
          }

          /**
           * עדכון סטטוס הבקשה ל"מאושר"
           */
          const updateRequestSql = `
            UPDATE trip_requests
            SET
              status = 'מאושר'
            WHERE request_id = ?
          `;

          db.query(updateRequestSql, [requestId], (err) => {
            if (err) {
              return db.rollback(() => {
                console.error("שגיאה בעדכון הבקשה:", err);
                res.status(500).json({ message: "שגיאה בעדכון הבקשה" });
              });
            }

            /**
             * יצירת קבוצה
             */
            const insertGroupSql = `
            INSERT INTO groups
            (
              request_id,
              trail_id,
              guide_id,
              trip_date,
              trip_time,
              meeting_point,
              status,
              change_reason,
              guide_change_reason
            )
            VALUES (?, ?, ?, ?, ?, ?, 'פעיל', ?, ?)
          `;

            db.query(
              insertGroupSql,
              [
                request.request_id,
                request.trail_id,
                newGuideId,
                trip_date,
                trip_time,
                meeting_point.trim(),
                dateOrTimeChanged ? change_reason.trim() : null,
                guideChanged ? guide_change_reason.trim() : null,
              ],
              (err, groupResult) => {
                if (err) {
                  return db.rollback(() => {
                    console.error("שגיאה ביצירת קבוצה:", err);
                    res.status(500).json({ message: "שגיאה ביצירת קבוצה" });
                  });
                }

                const groupId = groupResult.insertId;

                /**
                 * יצירת הדרכה (guidance) אוטומטית
                 */
                const insertGuidanceSql = `
                INSERT INTO guidances (group_id)
                VALUES (?)
              `;

                db.query(insertGuidanceSql, [groupId], (err) => {
                  if (err) {
                    return db.rollback(() => {
                      console.error("שגיאה ביצירת הדרכה:", err);
                      res.status(500).json({ message: "שגיאה ביצירת הדרכה" });
                    });
                  }

                  /**
                   * שליפת פרטי מדריך
                   */
                  const guideSql = `
                  SELECT full_name, phone, email
                  FROM users
                  WHERE user_id = ?
                  LIMIT 1
                `;

                  db.query(guideSql, [newGuideId], (err, guideRows) => {
                    if (err) {
                      return db.rollback(() => {
                        console.error("שגיאה בשליפת מדריך:", err);
                        res.status(500).json({ message: "שגיאה בשליפת מדריך" });
                      });
                    }

                    const guide = guideRows[0] || {};

                    /**
                     * שליפת פרטי מנהל לצורך החשבונית
                     */
                    const managerSql = `
                    SELECT full_name, phone, email
                    FROM users
                    WHERE role = 'מנהל'
                    LIMIT 1
                  `;

                    db.query(managerSql, (err, managerRows) => {
                      if (err) {
                        return db.rollback(() => {
                          console.error("שגיאה בשליפת מנהל:", err);
                          res
                            .status(500)
                            .json({ message: "שגיאה בשליפת מנהל" });
                        });
                      }

                      const manager = managerRows[0] || {};

                      /**
                       * שליפת מע״מ
                       */
                      getVatRate((err, VAT_RATE) => {
                        if (err) {
                          return db.rollback(() => {
                            console.error("שגיאה בשליפת מע״מ:", err);
                            res
                              .status(500)
                              .json({ message: "שגיאה בשליפת מע״מ" });
                          });
                        }

                        /**
                         * חישובי מחיר
                         */
                        const participantsPrice =
                          Number(request.number_of_participants || 0) *
                          Number(request.price_per_person || 0);

                        const vehiclesPrice =
                          Number(request.number_of_vehicles || 0) *
                          Number(request.price_per_vehicle || 0);

                        const totalBeforeVat =
                          participantsPrice + vehiclesPrice;
                        const vatAmount = totalBeforeVat * VAT_RATE;
                        const totalWithVat = totalBeforeVat + vatAmount;

                        /**
                         * יצירת חשבונית PDF
                         */

                        (async () => {
                          try {
                            const invoiceFile = await createInvoicePDF(
                              {
                                manager_name: manager.full_name,
                                manager_phone: manager.phone,
                                manager_email: manager.email,

                                group_id: groupId,

                                trail_name: request.trail_name,
                                trip_date,
                                trip_time,
                                meeting_point: meeting_point.trim(),

                                guide_name: guide.full_name,
                                guide_phone: guide.phone,
                                guide_email: guide.email,

                                number_of_participants:
                                  request.number_of_participants,
                                number_of_vehicles: request.number_of_vehicles,

                                price_per_person: Number(
                                  request.price_per_person || 0,
                                ),
                                price_per_vehicle: Number(
                                  request.price_per_vehicle || 0,
                                ),

                                total_before_vat: totalBeforeVat,
                                vat_amount: vatAmount,
                                total_with_vat: totalWithVat,
                              },
                              VAT_RATE,
                            );

                            const updateGroupInvoiceSql = `
                              UPDATE groups
                              SET invoice_file = ?
                              WHERE group_id = ?
                            `;

                            db.query(
                              updateGroupInvoiceSql,
                              [invoiceFile, groupId],
                              (err) => {
                                if (err) {
                                  return db.rollback(() => {
                                    console.error(
                                      "שגיאה בשמירת שם חשבונית:",
                                      err,
                                    );
                                    res.status(500).json({
                                      message: "שגיאה בשמירת החשבונית",
                                    });
                                  });
                                }

                                db.commit((err) => {
                                  if (err) {
                                    return db.rollback(() => {
                                      console.error("שגיאה ב-commit:", err);
                                      res.status(500).json({
                                        message: "שגיאה בשמירת הנתונים",
                                      });
                                    });
                                  }

                                  res.json({
                                    message:
                                      "הבקשה אושרה, נוצרה קבוצה ונוצרה חשבונית בהצלחה",
                                    group_id: groupId,
                                    invoice_file: invoiceFile,
                                  });
                                });
                              },
                            );
                          } catch (error) {
                            console.error("שגיאה ביצירת החשבונית:", error);

                            db.rollback(() => {
                              res.status(500).json({
                                message: "שגיאה ביצירת חשבונית",
                              });
                            });
                          }
                        })();
                      });
                    });
                  });
                });
              },
            );
          });
        });
      },
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

  db.beginTransaction((err) => {
    if (err) {
      console.error("שגיאה בפתיחת טרנזקציה:", err);
      return res.status(500).json({ message: "שגיאה בפתיחת טרנזקציה" });
    }

    const updateRequestSql = `
      UPDATE trip_requests
      SET
        status = 'מבוטל',
        cancel_requested = 0
      WHERE request_id = ?
    `;

    db.query(updateRequestSql, [requestId], (err) => {
      if (err) {
        return db.rollback(() => {
          console.error("שגיאה באישור ביטול בקשה:", err);
          res.status(500).json({ message: "שגיאה באישור ביטול הבקשה" });
        });
      }

      const updateGroupSql = `
        UPDATE groups
        SET status = 'בוטל'
        WHERE request_id = ?
      `;

      db.query(updateGroupSql, [requestId], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error("שגיאה בעדכון סטטוס קבוצה:", err);
            res.status(500).json({ message: "שגיאה בעדכון הקבוצה" });
          });
        }

        /**
         * עדכון הדרכה ל"בוטל"
         */
        const updateGuidanceSql = `
  UPDATE guidances
  SET status = 'בוטל'
  WHERE group_id IN (
    SELECT group_id FROM groups WHERE request_id = ?
  )
`;

        db.query(updateGuidanceSql, [requestId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error("שגיאה בעדכון הדרכה:", err);
              res.status(500).json({ message: "שגיאה בעדכון הדרכה" });
            });
          }

          // ✅ עכשיו כן עושים commit
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
});

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
  const requestId = req.params.requestId;

  const {
    reason,
    trip_date,
    trip_time,
    meeting_point,
    guide_id,
    change_reason,
    guide_change_reason,
  } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      message: "חובה לכתוב סיבה לדחיית הביטול",
    });
  }

  const requestSql = `
    SELECT tr.*, t.*
    FROM trip_requests tr
    JOIN trails t ON tr.trail_id = t.trail_id
    WHERE tr.request_id = ?
    LIMIT 1
  `;

  db.query(requestSql, [requestId], (err, rows) => {
    if (err || !rows.length) {
      return res.status(500).json({
        message: "שגיאה בשליפת הבקשה",
      });
    }

    const request = rows[0];

    db.query(
      `SELECT group_id FROM groups WHERE request_id=? LIMIT 1`,
      [requestId],
      (err, groups) => {
        if (err) {
          return res.status(500).json({
            message: "שגיאה בבדיקת קבוצה",
          });
        }

        // =========================
        // מצב 1 — יש קבוצה
        // =========================
        if (groups.length) {
          db.query(
            `UPDATE trip_requests
             SET status='מאושר',
                 cancel_requested=0,
                 cancel_reject_reason=?
             WHERE request_id=?`,
            [reason.trim(), requestId],
            (err) => {
              if (err) {
                return res.status(500).json({ message: "שגיאה בעדכון הבקשה" });
              }

              db.query(
                `UPDATE groups SET status='פעיל' WHERE request_id=?`,
                [requestId],
                (err) => {
                  if (err) {
                    return res
                      .status(500)
                      .json({ message: "שגיאה בעדכון הקבוצה" });
                  }

                  return res.json({
                    message: "בקשת הביטול נדחתה והקבוצה חזרה לפעיל",
                  });
                },
              );
            },
          );

          return; // ✅ חשוב
        }

        // =========================
        // מצב 2 — אין קבוצה
        // =========================

        if (!trip_date || !trip_time || !meeting_point || !guide_id) {
          return res.status(400).json({
            message: "חובה לשלוח תאריך, שעה, נקודת מפגש ומדריך",
          });
        }

        // בדיקת תאריך ושעה
        const error = validateTripDateTime(
          trip_date,
          trip_time,
          request.duration_minutes,
        );

        if (error) {
          return res.status(400).json({ message: error });
        }

        // ===== בדיקות שינוי (העתקה מ-approve)
        const originalDate = new Date(request.trip_date).toLocaleDateString(
          "sv-SE",
        );
        const newDate = trip_date;

        const originalTime = String(request.trip_time).slice(0, 5);
        const newTime = String(trip_time).slice(0, 5);

        const originalGuideId = Number(request.guide_id || 0);
        const newGuideId = Number(guide_id);

        const dateOrTimeChanged =
          originalDate !== newDate || originalTime !== newTime;

        const guideChanged = originalGuideId !== newGuideId;

        if (dateOrTimeChanged && (!change_reason || !change_reason.trim())) {
          return res.status(400).json({
            message: "חובה סיבה לשינוי תאריך/שעה",
          });
        }

        if (
          guideChanged &&
          (!guide_change_reason || !guide_change_reason.trim())
        ) {
          return res.status(400).json({
            message: "חובה סיבה להחלפת מדריך",
          });
        }

        // ===== בדיקת זמינות מדריך
        checkGuideAvailability(
          newGuideId,
          trip_date,
          trip_time,
          request.duration_minutes,
          null,
          (err, isAvailable) => {
            if (err) {
              return res.status(500).json({
                message: "שגיאה בבדיקת זמינות מדריך",
              });
            }

            if (!isAvailable) {
              return res.status(409).json({
                message: "המדריך תפוס בזמן הזה",
              });
            }

            db.beginTransaction((err) => {
              if (err) {
                return res.status(500).json({
                  message: "שגיאה בטרנזקציה",
                });
              }

              db.query(
                `UPDATE trip_requests
                 SET status='מאושר',
                     cancel_requested=0,
                     cancel_reject_reason=?
                 WHERE request_id=?`,
                [reason.trim(), requestId],
                (err) => {
                  if (err) {
                    return db.rollback(() =>
                      res.status(500).json({ message: "שגיאה בעדכון הבקשה" }),
                    );
                  }

                  db.query(
                    `INSERT INTO groups
                     (request_id, trail_id, guide_id, trip_date, trip_time, meeting_point, status, change_reason, guide_change_reason)
                     VALUES (?, ?, ?, ?, ?, ?, 'פעיל', ?, ?)`,
                    [
                      request.request_id,
                      request.trail_id,
                      newGuideId,
                      trip_date,
                      trip_time,
                      meeting_point.trim(),
                      dateOrTimeChanged ? change_reason.trim() : null,
                      guideChanged ? guide_change_reason.trim() : null,
                    ],
                    (err, result) => {
                      if (err) {
                        return db.rollback(() =>
                          res
                            .status(500)
                            .json({ message: "שגיאה ביצירת קבוצה" }),
                        );
                      }

                      const groupId = result.insertId;

                      /**
                       * יצירת הדרכה (guidance)
                       */
                      const insertGuidanceSql = `
  INSERT INTO guidances (group_id)
  VALUES (?)
`;

                      db.query(insertGuidanceSql, [groupId], (err) => {
                        if (err) {
                          return db.rollback(() =>
                            res
                              .status(500)
                              .json({ message: "שגיאה ביצירת הדרכה" }),
                          );
                        }

                        // ===== שליפת מדריך
                        db.query(
                          `SELECT full_name, phone, email FROM users WHERE user_id=? LIMIT 1`,
                          [newGuideId],
                          (err, guideRows) => {
                            const guide = guideRows[0] || {};

                            // ===== שליפת מנהל
                            db.query(
                              `SELECT full_name, phone, email FROM users WHERE role='מנהל' LIMIT 1`,
                              (err, managerRows) => {
                                const manager = managerRows[0] || {};
                                //שליפת המע''מ
                                getVatRate(async (err, VAT_RATE) => {
                                  if (err) {
                                    return db.rollback(() =>
                                      res
                                        .status(500)
                                        .json({ message: "שגיאה במע״מ" }),
                                    );
                                  }

                                  /**
                                   * חישובי מחיר
                                   */
                                  const participantsPrice =
                                    Number(
                                      request.number_of_participants || 0,
                                    ) * Number(request.price_per_person || 0);

                                  const vehiclesPrice =
                                    Number(request.number_of_vehicles || 0) *
                                    Number(request.price_per_vehicle || 0);

                                  const totalBeforeVat =
                                    participantsPrice + vehiclesPrice;
                                  const vatAmount = totalBeforeVat * VAT_RATE;
                                  const totalWithVat =
                                    totalBeforeVat + vatAmount;

                                  try {
                                    const invoiceFile = await createInvoicePDF(
                                      {
                                        manager_name: manager.full_name,
                                        manager_phone: manager.phone,
                                        manager_email: manager.email,

                                        group_id: groupId,

                                        trail_name: request.trail_name,
                                        trip_date,
                                        trip_time,
                                        meeting_point: meeting_point.trim(),

                                        guide_name: guide.full_name,
                                        guide_phone: guide.phone,
                                        guide_email: guide.email,

                                        number_of_participants:
                                          request.number_of_participants,
                                        number_of_vehicles:
                                          request.number_of_vehicles,

                                        price_per_person: Number(
                                          request.price_per_person || 0,
                                        ),
                                        price_per_vehicle: Number(
                                          request.price_per_vehicle || 0,
                                        ),

                                        total_before_vat: totalBeforeVat,
                                        vat_amount: vatAmount,
                                        total_with_vat: totalWithVat,
                                      },
                                      VAT_RATE,
                                    );

                                    db.query(
                                      `UPDATE groups SET invoice_file=? WHERE group_id=?`,
                                      [invoiceFile, groupId],
                                      (err) => {
                                        if (err) {
                                          return db.rollback(() =>
                                            res.status(500).json({
                                              message: "שגיאה בשמירת חשבונית",
                                            }),
                                          );
                                        }

                                        db.commit((err) => {
                                          if (err) {
                                            return db.rollback(() =>
                                              res.status(500).json({
                                                message: "שגיאה בשמירה",
                                              }),
                                            );
                                          }

                                          res.json({
                                            message:
                                              "בקשת הביטול נדחתה, נוצרה קבוצה עם הנתונים החדשים",
                                          });
                                        });
                                      },
                                    );
                                  } catch (error) {
                                    db.rollback(() =>
                                      res.status(500).json({
                                        message: "שגיאה ביצירת חשבונית",
                                      }),
                                    );
                                  }
                                });
                              },
                            );
                          },
                        );
                      });
                    },
                  );
                },
              );
            });
          },
        );
      },
    );
  });
});
/**
 * ------------------------------------------------
 * PUT
 * שינוי מדריך לקבוצה
 * ------------------------------------------------
 *
 * חייבים לשלוח:
 * - guide_id
 * - reason
 */
router.put("/changeGuide/:groupId", (req, res) => {
  const groupId = req.params.groupId;
  const { guide_id, reason } = req.body;

  if (!guide_id) {
    return res.status(400).json({
      message: "חובה לבחור מדריך חדש",
    });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      message: "חובה לכתוב סיבה לשינוי מדריך",
    });
  }

  /**
   * שליפת פרטי הקבוצה
   */
  const groupSql = `
    SELECT
      g.group_id,
      g.trip_date,
      g.trip_time,
      g.trail_id,
      t.duration_minutes
    FROM groups g
    JOIN trails t
      ON g.trail_id = t.trail_id
    WHERE g.group_id = ?
    LIMIT 1
  `;

  db.query(groupSql, [groupId], (err, groupRows) => {
    if (err) {
      console.error("שגיאה בשליפת קבוצה:", err);
      return res.status(500).json({ message: "שגיאה בשליפת הקבוצה" });
    }

    if (!groupRows.length) {
      return res.status(404).json({ message: "הקבוצה לא נמצאה" });
    }

    const group = groupRows[0];

    /**
     * בדיקת זמינות מדריך חדש
     */
    checkGuideAvailability(
      Number(guide_id),
      group.trip_date,
      group.trip_time,
      group.duration_minutes,
      Number(groupId),
      (err, isAvailable) => {
        if (err) {
          console.error("שגיאה בבדיקת זמינות מדריך:", err);
          return res.status(500).json({ message: "שגיאה בבדיקת זמינות מדריך" });
        }

        if (!isAvailable) {
          return res.status(409).json({
            message: "המדריך החדש כבר משובץ לטיול אחר בזמן זה",
          });
        }

        const sql = `
          UPDATE groups
          SET
            guide_id = ?,
            guide_change_reason = ?
          WHERE group_id = ?
        `;

        db.query(sql, [guide_id, reason.trim(), groupId], (err) => {
          if (err) {
            console.error("שגיאה בשינוי מדריך:", err);
            return res.status(500).json({ message: "שגיאה בשינוי מדריך" });
          }

          res.json({
            message: "המדריך שונה בהצלחה",
          });
        });
      },
    );
  });
});

module.exports = router;
