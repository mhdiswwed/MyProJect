import styles from "./reportsTable.module.css";
import { FaClock, FaExclamationTriangle } from "react-icons/fa";
import API_BASE from "../../../config/api";

/**
 * קומפוננטה להצגת דיווחים חדשים מהשטח
 *
 * הקומפוננטה מקבלת מערך דיווחים ומציגה:
 * - תמונה של הדיווח
 * - סוג הבעיה עם אייקון
 * - תיאור הבעיה
 * - שם המסלול
 * - זמן יחסי (לפני כמה זמן)
 * - סטטוס בצד
 *
 * הדיווחים המוצגים הם מהיומיים האחרונים בלבד
 */
export default function ReportsTable({ reports = [] }) {
  // פונקציה שמחזירה "לפני כמה זמן"
  function timeAgo(date) {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);

    if (diff < 60) return "לפני רגע";
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
    return `לפני ${Math.floor(diff / 86400)} ימים`;
  }

  return (
    <div className={styles.box}>
      {/* כותרת */}
      <div className={styles.header}>
        <div>
          <h3>דיווחים חדשים מהשטח</h3>
          <span className={styles.subtitle}>יומיים אחרונים</span>
        </div>

        {/* ספירה */}
        <span className={styles.count}>{reports.length} חדשים</span>
      </div>

      {/* אם אין דיווחים */}
      {reports.length === 0 ? (
        <p>אין דיווחים</p>
      ) : (
        reports.map((r) => (
          <div key={r.report_id} className={styles.item}>
            {/* תמונה בצד (ימין כי RTL) */}
            <img
              src={`${API_BASE}/${r.image_path}`}
              alt="report"
              className={styles.image}
            />

            {/* תוכן */}
            <div className={styles.content}>
              {/* סוג בעיה */}
              <div className={styles.problem}>
                <FaExclamationTriangle className={styles.icon} />
                {r.problem_type}
              </div>

              {/* תיאור */}
              <div className={styles.description}>{r.description}</div>

              {/* מסלול */}
              <div className={styles.trail}>{r.trail_name || "ללא מסלול"}</div>

              {/* זמן */}
              <div className={styles.time}>
                <FaClock className={styles.iconSmall} />
                {timeAgo(r.report_time)}
              </div>
            </div>

            {/* סטטוס בצד */}
            <div className={`${styles.status} ${styles[r.status]}`}>
              {r.status}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
