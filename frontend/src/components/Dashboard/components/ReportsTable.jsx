/**
 * קומפוננטה להצגת דיווחים  מהשטח
 * הקומפוננטה מקבלת מערך דיווחים ומציגה:
 * - תמונה של הדיווח
 * - סוג הבעיה עם אייקון
 * - תיאור הבעיה
 * - שם המסלול
 * - זמן יחסי (לפני כמה זמן)
 * - סטטוס בצד
 * הדיווחים המוצגים הם לפי תארכים שנבחרו
 */

import styles from "./reportsTable.module.css";
import {
  FaClock,
  FaExclamationTriangle,
  FaBan,
  FaTools,
  FaBroom,
} from "react-icons/fa";
import API_BASE from "../../../config/api";

export default function ReportsTable({ reports = [] }) {
  // פונקציה שמחזירה "לפני כמה זמן"
  function formatReportTime(date) {
    const reportDate = new Date(date);
    const diffSeconds = Math.floor((new Date() - reportDate) / 1000);

    // אם פחות מדקה
    if (diffSeconds < 60) {
      return "לפני רגע";
    }

    // אם פחות משעה
    if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `לפני ${minutes} דקות`;
    }

    // אם פחות מיום
    if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);

      if (minutes === 0) {
        return `לפני ${hours} שעות`;
      }

      return `לפני ${hours} שעות ו־${minutes} דקות`;
    }

    // אם יותר מיום – מציגים תאריך ושעה
    return reportDate.toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }
  //========================
  // פונקציה שמחזירה סטטוס תצוגה
  //========================
  function getDisplayStatus(status) {
    switch (status) {
      case "חדש":
        return {
          text: "חדש",
          className: "urgent",
        };

      case "בטיפול":
        return {
          text: "בטיפול",
          className: "medium",
        };

      case "טופל":
        return {
          text: "טופל",
          className: "done",
        };

      default:
        return {
          text: status,
          className: "medium",
        };
    }
  }

  //===================================
  // פונקציה שמחזירה אייקון לפי סוג בעיה
  //===================================
  function getProblemIcon(type) {
    switch (type) {
      case "סכנה":
        return <FaExclamationTriangle className={styles.iconDanger} />;

      case "חסימה":
        return <FaBan className={styles.iconBlock} />;

      case "תחזוקה":
        return <FaTools className={styles.iconMaintenance} />;

      case "ניקיון":
        return <FaBroom className={styles.iconClean} />;

      default:
        return <FaExclamationTriangle className={styles.icon} />;
    }
  }

  return (
    <div className={styles.box}>
      {/* כותרת */}
      <div className={styles.header}>
        <div>
          <h3>דיווחים מהשטח</h3>
        </div>

        {/* ספירה */}
        <span className={styles.count}>{reports.length} דיווחים</span>
      </div>

      {/* אם אין דיווחים */}
      {reports.length === 0 ? (
        <p>אין דיווחים</p>
      ) : (
        reports.map((r) => {
          const status = getDisplayStatus(r.status);
          return (
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
                  {getProblemIcon(r.problem_type)}
                  {r.problem_type}
                </div>

                {/* תיאור */}
                <div className={styles.description}>{r.description}</div>

                {/* מסלול */}
                <div className={styles.trail}>
                  {r.trail_name || "ללא מסלול"}
                </div>

                {/* זמן */}
                <div className={styles.time}>
                  <FaClock className={styles.iconSmall} />
                  {formatReportTime(r.report_time)}
                </div>
              </div>
              {/* סוג דיווח  בצד */}
              <div className={`${styles.status} ${styles[status.className]}`}>
                {status.text}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
