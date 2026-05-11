/**===========================================================================
Sidebar
קומפוננטת תפריט צד למנהל עם קישורי ניווט , הדגשת עמוד פעיל, ותצוגת סטטוס שרת בזמן אמת
 =============================================================================*/

import { NavLink } from "react-router-dom";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={styles.menuBtn}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "X" : "☰"}
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)} />
      )}
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
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
            onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.active}` : styles.link
            }
          >
            <FiSettings />
            הגדרות המערכת
          </NavLink>
        </div>

        {/*רכיב סטטוס שרת בודיק תקינות השרת*/}
        <div className={styles.serverStatusWrapper}>
          <ServerStatus />
        </div>
      </aside>
    </>
  );
}
