/**
 * Dashboard.jsx
 * ------------------------------------------------
 * קומפוננטת לוח הבקרה של המנהל
 *
 * תפקיד הקומפוננטה:
 * - להציג נתונים מרכזיים על פעילות המערכת
 * - להציג סטטיסטיקות למנהל בצורה מהירה וברורה
 *
 * דוגמאות לנתונים המוצגים:
 * - מספר בקשות פתוחות לטיול
 * - מספר טיולים פעילים
 * - מספר דיווחים חדשים מהשטח
 * - מספר משימות פתוחות
 * - מספר מסלולים פעילים
 * - מספר טיולים קרובים
 *
 * בעתיד ניתן לחבר נתונים אלו לבסיס הנתונים
 * באמצעות קריאות API מהשרת
 */

import styles from "./dashboard.module.css";

export default function Dashboard() {
  return (
    <div className={styles.dashboard}>
      {/* כרטיס סטטיסטיקה */}
      <div className={styles.card}>
        <h3>בקשות פתוחות</h3>
        <h1>3</h1>
      </div>

      <div className={styles.card}>
        <h3>טיולים פעילים</h3>
        <h1>1</h1>
      </div>

      <div className={styles.card}>
        <h3>דיווחים חדשים</h3>
        <h1>2</h1>
      </div>

      <div className={styles.card}>
        <h3>משימות פתוחות</h3>
        <h1>4</h1>
      </div>

      <div className={styles.card}>
        <h3>מסלולים פעילים</h3>
        <h1>7</h1>
      </div>

      <div className={styles.card}>
        <h3>טיולים קרובים</h3>
        <h1>2</h1>
      </div>
    </div>
  );
}
