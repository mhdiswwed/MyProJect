import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";
import API_BASE from "../../config/api";

// קומפוננטות
import StatsCards from "./components/StatsCards";
import RequestsAndTasks from "./components/RequestsAndTasks";
import ReportsTable from "./components/ReportsTable";
import ChartsSection from "./components/ChartsSection";

export default function Dashboard() {
  // נתונים מהשרת
  const [data, setData] = useState(null);

  /**
   * =========================================
   * טעינת נתונים מהשרת
   * =========================================
   */
  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`);
      const json = await res.json();

      setData(json);
    } catch (err) {
      console.error("שגיאה בדשבורד:", err);
    }
  }

  if (!data) return <div className={styles.page}>טוען...</div>;

  return (
    <div className={styles.page} dir="rtl">
      {/* כרטיסים עליונים */}
      <StatsCards stats={data.stats} />

      {/* גרפים*/}
      <ChartsSection />

      {/* אזור אמצעי */}
      <RequestsAndTasks requests={data.requests} tasks={data.tasks} />

      {/* טבלה תחתונה */}
      <ReportsTable requests={data.requests} />
    </div>
  );
}
