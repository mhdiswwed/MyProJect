/**
 * AdminLayout.jsx
 * ------------------------------------------------
 * קומפוננטת Layout עבור אזור הניהול של המערכת
 *
 * תפקיד הקומפוננטה:
 * - להציג את תפריט הצד (Sidebar) של המנהל
 * - להציג את תוכן הדף שנבחר באזור המרכזי
 *
 * כיצד זה עובד:
 * - Sidebar מופיע בצד ימין של המסך
 * - Outlet מציג את הדף שנבחר דרך React Router
 *
 * דוגמאות לדפים שיטענו כאן:
 * - Dashboard (לוח בקרה)
 * - ניהול מסלולים
 * - דיווחים מהשטח
 * - ניהול משתמשים
 */

import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import styles from "./adminLayout.module.css";

export default function AdminLayout() {
  return (
    <div className={styles.layout}>
      {/* תפריט הצד של הניהול */}
      <Sidebar />

      {/* אזור התוכן המרכזי */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
