/**
 * ------------------------------------------------
 * קומפוננטה: StatsCards
 * ------------------------------------------------
 * תיאור:
 * מציגה 4 כרטיסי סטטיסטיקה בלוח הבקרה
 * עם אייקונים, מספר וכותרת.
 */

import styles from "./statsCards.module.css";
import {
  FaClipboardList,
  FaHourglassHalf,
  FaUsers,
  FaTasks,
} from "react-icons/fa";

export default function StatsCards({ stats }) {
  /* ערכי ברירת מחדל כדי למנוע קריסה אם הנתונים עדיין לא הגיעו */
  const safeStats = {
    totalRequests: stats?.totalRequests ?? 0,
    pendingRequests: stats?.pendingRequests ?? 0,
    activeGroups: stats?.activeGroups ?? 0,
    openTasks: stats?.openTasks ?? 0,
  };

  return (
    <div className={styles.row}>
      {/* כרטיס 1 - סה"כ בקשות */}
      <div className={styles.card}>
        <div className={`${styles.iconBox} ${styles.blueIcon}`}>
          <FaClipboardList />
        </div>

        <div className={styles.info}>
          <div className={styles.title}>סה"כ בקשות</div>
          <div className={styles.number}>{safeStats.totalRequests}</div>
        </div>
      </div>

      {/* כרטיס 2 - בקשות ממתינות */}
      <div className={styles.card}>
        <div className={`${styles.iconBox} ${styles.yellowIcon}`}>
          <FaHourglassHalf />
        </div>

        <div className={styles.info}>
          <div className={styles.title}>ממתינות</div>
          <div className={styles.number}>{safeStats.pendingRequests}</div>
        </div>
      </div>

      {/* כרטיס 3 - קבוצות פעילות */}
      <div className={styles.card}>
        <div className={`${styles.iconBox} ${styles.greenIcon}`}>
          <FaUsers />
        </div>

        <div className={styles.info}>
          <div className={styles.title}>קבוצות פעילות</div>
          <div className={styles.number}>{safeStats.activeGroups}</div>
        </div>
      </div>

      {/* כרטיס 4 - משימות פתוחות */}
      <div className={styles.card}>
        <div className={`${styles.iconBox} ${styles.openIcon}`}>
          <FaTasks />
        </div>

        <div className={styles.info}>
          <div className={styles.title}>משימות פתוחות</div>
          <div className={styles.number}>{safeStats.openTasks}</div>
        </div>
      </div>
    </div>
  );
}
