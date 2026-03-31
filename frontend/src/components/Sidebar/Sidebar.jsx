/**
 * Sidebar.jsx
 * ------------------------------------------------
 * קומפוננטת תפריט צד עם Active Link (React Router)
 */

import { NavLink } from "react-router-dom";
import styles from "./sidebar.module.css";

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
      <h2 className={styles.title}>לוח בקרה</h2>

      {/* לוח בקרה */}
      <NavLink
        to="/admin/dashboard"
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
        to="/admin/reports"
        className={({ isActive }) =>
          isActive ? `${styles.link} ${styles.active}` : styles.link
        }
      >
        <FiFileText />
        דיווחים מהשטח
      </NavLink>

      {/* משימות */}
      <NavLink
        to="/admin/tasks"
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
    </aside>
  );
}
