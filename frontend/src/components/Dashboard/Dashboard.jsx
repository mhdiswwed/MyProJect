import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";
import API_BASE from "../../config/api";

// קומפוננטות
import StatsCards from "./components/StatsCards";
import RequestsAndTasks from "./components/RequestsAndTasks";
import ReportsTable from "./components/ReportsTable";
import ChartsSection from "./components/ChartsSection";

/**
 * קומפוננטת לוח בקרה (Dashboard)
 * מציגה נתונים כלליים על המערכת:
 * - סטטיסטיקות
 * - גרפים
 * - בקשות ומשימות
 * - טבלת דוחות
 */
export default function Dashboard() {
  // שמירת הנתונים מהשרת
  const [data, setData] = useState(null);

  // טעינת נתונים בעת כניסה לדף
  useEffect(() => {
    loadDashboard();
  }, []);

  /**
   * שליפת נתוני הדשבורד מהשרת
   */
  async function loadDashboard() {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`);
      const json = await res.json();

      setData(json);
    } catch (err) {
      console.error("שגיאה בדשבורד:", err);
    }
  }

  // בזמן טעינה
  if (!data) return <div className={styles.page}>טוען...</div>;

  return (
    <div className={styles.page} dir="rtl">
      {/* כותרת הדף */}
      <div className={styles.header}>
        <h1 className={styles.title}>לוח בקרה</h1>
        <p className={styles.subtitle}>סקירה כללית של מערכת ניהול הטיולים</p>
      </div>

      {/* כרטיסי סטטיסטיקה */}
      <StatsCards stats={data.stats} />

      {/* גרפים */}
      <ChartsSection />

      {/* בקשות ומשימות */}
      <RequestsAndTasks requests={data.requests} tasks={data.tasks} />

      {/* טבלת דוחות */}
      <ReportsTable requests={data.requests} />
    </div>
  );
}
