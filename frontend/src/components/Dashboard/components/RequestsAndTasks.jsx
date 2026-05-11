/*=======================================================
קומבוננטה שבונה ומחזירה שתי טבלאות של בקשות אחרונות, לפי תאריכים שבוחר המשתמש 
+
 משימות  ,לפי תאריכים שבוחר המשתמם
=========================================================*/

import styles from "./requestsAndTasks.module.css";
import { FaCalendarAlt } from "react-icons/fa";

// פונקציה שממירה תאריך לפורמט קריא
function formatDate(date) {
  const d = new Date(date);
  return (
    d.toLocaleDateString("he-IL") +
    " " +
    d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function RequestsAndTasks({ requests = [], tasks = [] }) {
//================================
//פונקציה מחזירה הצבע המתאים לסטטוס
//===============================
  const statusClassMap = {
    ממתין: styles.statusPending,
    מאושר: styles.statusApproved,
    נדחה: styles.statusRejected,
    מבוטל: styles.statusCancelled,
    "מבקש ביטול": styles.statusCancelRequest,
  };
  return (
    <div className={styles.container}>
      {/* ===== בקשות אחרונות ===== */}
      <div className={styles.box1}>
        {/* כותרת עם מספר בקשות */}
        <div className={styles.header}>
          <div>
            <h3>בקשות אחרונות</h3>
          </div>

          <span className={styles.count}>{requests.length} בקשות</span>
        </div>
        {/* כותרת טבלה */}
        <div className={styles.tableHeader}>
          <span>תאריך ושעת הגשת הבקשה</span>
          <span>מבקש</span>
          <span>מסלול</span>
          <span>תאריך ושעה מבוקשת</span>
          <span>סטטוס</span>
        </div>

        {/* אם אין בקשות */}
        {requests.length === 0 ? (
          <p>אין בקשות</p>
        ) : (
          // מעבר על כל הבקשות
          requests.map((r) => (
            <div key={r.request_id} className={styles.row}>
              {/* תאריך + אייקון */}
              <span className={styles.date}>
                <FaCalendarAlt /> {formatDate(r.created_at)}
              </span>

              {/* שם מבקש */}
              <span>{r.full_name}</span>

              {/* שם מסלול */}
              <span>{r.trail_name}</span>

              {/* סטטוס עם צבע */}
              <span className={`${styles.status} ${statusClassMap[r.status]}`}>
                {r.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ===== משימות ===== */}
      <div className={styles.box2}>
        {/* כותרת עם מספר משימות */}
        <div className={styles.header}>
          <div>
            <h3>{tasks.length} משימות  </h3>
          </div>
        </div>

        {/* אם אין משימות */}
        {tasks.length === 0 ? (
          <p>אין משימות</p>
        ) : (
          // מעבר על כל המשימות
          tasks.map((t) => (
            <div key={t.task_id} className={styles.taskItem}>
              {/* שורה עליונה - סוג + סטטוס */}
              <div className={styles.taskTop}>
                <span className={styles.taskType}>{t.task_type}</span>
                <span className={styles.status}>{t.status}</span>
              </div>

              {/* תיאור המשימה */}
              <div className={styles.taskDesc}>{t.description}</div>

              {/* תאריך התחלה */}
              <div className={styles.taskDate}>
                <FaCalendarAlt /> {formatDate(t.start_time)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
