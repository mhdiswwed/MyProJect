/*//===================================
ManageGroups.js
ראוטר לניהול קבוצות והדרכות – שליפת קבוצות, אישור/דחיית ביטולים, יצירת קבוצה מחדש, עדכון סטטוסים וביטול מלא של הדרכה כולל כל הקשרים במערכת
//====================================*/

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

      guide.full_name AS guide_name,

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

  LEFT JOIN users guide
     ON g.guide_id = guide.user_id

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


/**==============================================
 * פונקציה ראשית
 * מקבלת: req, res
 * עושה: מפעילה את כל שלבי הביטול (בקשה, קבוצה, הדרכה)
 * מחזירה: תשובה ללקוח
 =================================================*/
router.put("/approveCancel/:requestId", (req, res) => {
  const requestId = req.params.requestId;

  startTransaction(res, () => {
    updateRequest(requestId, res, () => {
      updateGroup(requestId, res, () => {
        updateGuidance(requestId, res, () => {
          commit(res);
        });
      });
    });
  });
});

/**---------------------------------------
 * מקבלת: res, callback
 * )עושה: פותחת טרנזקציה
 * * מתחיל את הפעולה מול מסד הנתונים
----------------------------------------------- */
function startTransaction(res, callback) {
  db.beginTransaction((err) => {
    if (err) return error(res, "שגיאה במסד הנתונים", err);
    callback();
  });
}

/**--------------------------------------------
 * מקבלת: requestId, res, callback
 * עושה: מעדכנת בקשה ל"מבוטל"
-----------------------------------------------*/
function updateRequest(requestId, res, callback) {
  const sql = `
    UPDATE trip_requests
    SET status='מבוטל', cancel_requested=0
    WHERE request_id=?
  `;

  db.query(sql, [requestId], (err) => {
    if (err) return error(res, "שגיאה בבקשה", err);
    callback();
  });
}

/**------------------------------------------
 * מקבלת: requestId, res, callback
 * עושה: מעדכנת קבוצה ל"בוטל"
 ---------------------------------------------*/
function updateGroup(requestId, res, callback) {
  const sql = `
    UPDATE groups
    SET status='בוטל'
    WHERE request_id=?
  `;

  db.query(sql, [requestId], (err) => {
    if (err) return error(res, "שגיאה בקבוצה", err);
    callback();
  });
}

/**----------------------------------------------
 * מקבלת: requestId, res, callback
 * עושה: מעדכנת הדרכות ל"בוטל"
 ------------------------------------------------*/
function updateGuidance(requestId, res, callback) {
  const sql = `
    UPDATE guidances
    SET status='בוטל'
    WHERE group_id IN (
      SELECT group_id FROM groups WHERE request_id=?
    )
  `;

  db.query(sql, [requestId], (err) => {
    if (err) return error(res, "שגיאה בהדרכה", err);
    callback();
  });
}

/**-------------------------------
 * מקבלת: res
 * עושה: שומרת שינויים
 -------------------------------*/
function commit(res) {
  db.commit((err) => {
    if (err) return error(res, "שגיאה בשמירה", err);
    res.json({ message: "הביטול אושר" });
  });
}

/**------------------------------------------
 * מקבלת: res, הודעה, שגיאה
 * עושה: מבטלת טרנזקציה ומחזירה שגיאה
 ------------------------------------------------*/
function error(res, message, err) {
  db.rollback(() => {
    console.error(message, err);
    res.status(500).json({ message });
  });
}

/**
 * ============================
 * PUT
 * דחיית ביטול בקשה
 *============================
 *
 * מחזיר את הבקשה והקבוצה למצב פעיל
 */
router.put("/rejectCancel/:requestId", (req, res) => {
  const requestId = req.params.requestId;
  const { reason } = req.body;//סיבה לדחייה

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "חובה סיבה" });
  }

  restoreGroup(requestId, reason, res);
});

/**---------------------------------------------
 * מקבלת: requestId, reason, res
 * עושה: מחזירה בקשה וקבוצה למצב פעיל
 * מחזירה: תשובה ללקוח
 -------------------------------------------------*/
function restoreGroup(requestId, reason, res) {
  db.query(
    `UPDATE trip_requests 
     SET status='מאושר', cancel_requested=0, cancel_reject_reason=? 
     WHERE request_id=?`,
    [reason.trim(), requestId],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "שגיאה במסד הנתונים" });
      }

      updateGroupStatus(requestId, res);
    }
  );
}

/**-----------------------------------------------
 * מקבלת: requestId, res
 * עושה: מעדכנת קבוצה למצב פעיל
 * מחזירה: תשובה ללקוח
 -------------------------------------------------*/
function updateGroupStatus(requestId, res) {
  db.query(
    `UPDATE groups SET status='פעיל' WHERE request_id=?`,
    [requestId],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "שגיאה במסד הנתונים" });
      }

      res.json({
        message: "בקשת הביטול נדחתה והקבוצה חזרה לפעיל",
      });
    }
  );
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



module.exports = router;
