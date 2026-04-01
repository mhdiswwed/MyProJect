//===================================
// רוותיר לניהול קבוצות על ידי מנהל
//====================================

const express = require("express");
const router = express.Router();

const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

/**
 * =========================================
 * GET
 * שליפת כל הקבוצות לניהול
 * =========================================
 */
router.get("/", (req, res) => {
  const sql = `
    SELECT
      g.group_id,
      g.request_id,
      g.trip_date,
      g.trip_time,
      g.meeting_point,
      g.status,

      t.trail_name,
      t.duration_minutes,

      u.full_name AS
       user_name,
       u.phone,
        u.email,

      gd.status AS guidance_status,

      tr.cancel_reason,
tr.cancel_reject_reason,
tr.reject_reason,
g.change_reason,
g.guide_change_reason

    FROM groups g

    JOIN trails t
      ON g.trail_id = t.trail_id

    JOIN trip_requests tr
      ON g.request_id = tr.request_id

    JOIN users u
      ON tr.user_id = u.user_id

    LEFT JOIN guidances gd
      ON g.group_id = gd.group_id

    ORDER BY 
    CASE
      WHEN g.status = 'מבקש ביטול' THEN 1
      WHEN g.status = 'פעיל' AND (gd.status IS NULL OR gd.status <> 'בתהליך') THEN 2
      WHEN g.status = 'פעיל' AND gd.status = 'בתהליך' THEN 3
      WHEN g.status = 'הסתיים' THEN 4
      WHEN g.status = 'בוטל' THEN 5
      ELSE 6
    END,
    g.trip_date ASC,
    g.trip_time ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("שגיאה בשליפת קבוצות:", err);
      return res.status(500).json({
        message: "שגיאה בשליפת קבוצות",
      });
    }

    res.json(results);
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



module.exports = router;
