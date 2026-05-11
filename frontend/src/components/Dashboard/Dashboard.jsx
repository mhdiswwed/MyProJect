import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";
import API_BASE from "../../config/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
  // תאריך התחלה
  const [fromDate, setFromDate] = useState("");
  // תאריך סיום
  const [toDate, setToDate] = useState("");
  const [fromDateObj, setFromDateObj] = useState(null);
  const [toDateObj, setToDateObj] = useState(null);

  //סנכרון עם הפורמט שהשרת מצפה לו
  useEffect(() => {
    setFromDate(fromDateObj ? fromDateObj.toISOString().split("T")[0] : "");

    setToDate(toDateObj ? toDateObj.toISOString().split("T")[0] : "");
  }, [fromDateObj, toDateObj]);

  // טעינת נתונים בעת כניסה לדף
  useEffect(() => {
    loadDashboard();
  }, [fromDate, toDate]);

  /**
   * שליפת נתוני הדשבורד מהשרת
   */
  async function loadDashboard() {
    try {
      let url = `${API_BASE}/api/dashboard`;

      // אם נבחרו תאריכים
      if (fromDate && toDate) {
        url += `?fromDate=${fromDate}&toDate=${toDate}`;
      }

      const res = await fetch(url);
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
        {/* סינון לפי תאריכים */}
        <div className={styles.dateFilters}>
          <div className={styles.inputGroup}>
            <label>מתאריך</label>
            <DatePicker
              selected={fromDateObj}
              onChange={(date) => setFromDateObj(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="בחר תאריך"
              className={styles.dateInput}
              popperPlacement="bottom-start"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>עד תאריך</label>
            <DatePicker
              selected={toDateObj}
              onChange={(date) => setToDateObj(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="בחר תאריך"
              className={styles.dateInput}
              popperPlacement="bottom-start"
            />
          </div>
        </div>
      </div>

      {/* כרטיסי סטטיסטיקה */}
      <StatsCards stats={data.stats} />

      {/* גרפים */}
      <ChartsSection fromDate={fromDate} toDate={toDate} />

      {/* בקשות ומשימות */}
      <RequestsAndTasks requests={data.latestRequests} tasks={data.tasks} />

      {/* טבלת דוחות */}
      <ReportsTable reports={data.reports} />
    </div>
  );
}
