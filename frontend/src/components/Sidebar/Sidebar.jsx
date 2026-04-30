/**===========================================================================
Sidebar
קומפוננטת תפריט צד למנהל עם קישורי ניווט (React Router), הדגשת עמוד פעיל, ותצוגת סטטוס שרת בזמן אמת
 =============================================================================*/

import { NavLink } from "react-router-dom";
import styles from "./sidebar.module.css";
import logo from "../../assets/removebg-preview.png";
// מביא קומפוננטת רכיב סטטוס שרת לסרגל הצד עם בדיקת תקינות השרת" 
import ServerStatus from "../ServerStatus/ServerStatus";

/* ================================
   אייקונים
================================ */

import {
  FiHome,
  FiClipboard,
  FiMap,
  FiUserCheck,
  FiUsers,
  FiFileText,
  FiCheckSquare,
  FiSettings,
} from "react-icons/fi";

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      {/* כותרת */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <img src={logo} alt="Trail Quest" />
        </div>
        <div className={styles.texts}>
          <span className={styles.mainTitle}>מערכת ניהול</span>
          <span className={styles.subTitle}>מסלולי טיולים</span>
        </div>
      </div>
      <div className={styles.links}>
        {/* לוח בקרה */}
        <NavLink
          to="/admin/Dashboard"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <FiHome />
          לוח בקרה
        </NavLink>

        {/* בקשות */}
        <NavLink
          to="/admin/ManageRequests"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <FiClipboard />
          בקשות ליציאה לטיול
        </NavLink>

        {/* מסלולים */}
        <NavLink
          to="/admin/ManagementTrails"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <FiMap />
          ניהול מסלולים
        </NavLink>

        {/* הדרכות*/}
        <NavLink
          to="/admin/ManageGuidances"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <FiUserCheck />
          ניהול הדרכות
        </NavLink>

        {/* קבוצות */}
        <NavLink
          to="/admin/ManageGroups/"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <FiUsers />
          ניהול קבוצות
        </NavLink>

        {/* דיווחים */}
        <NavLink
          to="/admin/FieldReports"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <FiFileText />
          דיווחים מהשטח
        </NavLink>

        {/* משימות */}
        <NavLink
          to="/admin/TaskManagement"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <FiCheckSquare />
          ניהול משימות
        </NavLink>

        {/* משתמשים */}
        <NavLink
          to="/admin/UsersManagement"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <FiUsers />
          ניהול משתמשים
        </NavLink>

        {/* הגדרות */}
        <NavLink
          to="/admin/SystemSettings"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <FiSettings />
          הגדרות המערכת
        </NavLink>
      </div>

      {/*רכיב סטטוס שרת בודיק תקינות השרת*/}
      <ServerStatus />
    </aside>
  );
}
