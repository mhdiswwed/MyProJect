// ייבוא אייקונים של משתמש ויציאה מהספרייה
import { FaUser, FaSignOutAlt } from "react-icons/fa";

// ייבוא כלים לניווט וזיהוי נתיב נוכחי
import { useNavigate, useLocation } from "react-router-dom";

// ייבוא קובץ עיצוב ייחודי לקומפוננטה
import styles from "./header.module.css";

// ייבוא תמונת הלוגו
import logo from "../../assets/trailQuest.png";

// קומפוננטת כותרת עליונה של האתר
// מקבלת:
// user – אובייקט המשתמש המחובר
// onLogout – פונקציה שמתבצעת בעת יציאה מהמערכת
export default function Header({ user, onLogout }) {
  // יצירת כלי לביצוע מעבר בין עמודים
  const navigate = useNavigate();

  // קבלת מידע על הנתיב הנוכחי בדפדפן
  const location = useLocation();

  // פונקציה שבודקת אם הנתיב הנוכחי שווה לנתיב שנשלח אליה
  // משמשת כדי להדגיש את העמוד הפעיל בתפריט
  function isActive(path) {
    return location.pathname === path;
  }

  // שליפת התפקיד של המשתמש (אם קיים)
  const role = user?.role;

  // בדיקה אם המשתמש הוא מנהל
  const isAdmin = role === "מנהל";

  // בדיקה אם המשתמש הוא מדריך
  const isGuide = role === "מדריך";

  // פונקציה שמופעלת בלחיצה על אזור המשתמש
  function handleUserClick() {
    if (!user) {
      navigate("/login");
      return;
    }

    // Redirect user according to role
    switch (user.role) {
      case "מנהל":
        navigate("/admin");
        break;

      case "נציג קבוצה":
        navigate("/trails");
        break;

      case "עובד":
        navigate("/myTasks");
        break;

      case "מדריך":
        navigate("/guide");
        break;

      default:
        navigate("/profile");
    }
  }

  // החזרת המבנה הגרפי של הקומפוננטה
  return (
    // כותרת עליונה של האתר
    <header className={styles.header}>
      <div className={styles.container}>
        {/* כפתור לוגו שמעביר לדף הבית */}
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate("/")}
          aria-label="מעבר לעמוד המסלולים"
        >
          <img src={logo} alt="Trail Quest" className={styles.logo} />
        </button>

        {/* אזור תפריט ניווט */}
        <nav className={styles.nav}>
          {/* כפתור מסלולים */}
          <button
            className={`${styles.navBtn} ${isActive("/") ? styles.active : ""}`}
            onClick={() => navigate("/")}
          >
            מסלולים
          </button>

          {/* כפתור מי אנחנו */}
          <button
            className={`${styles.navBtn} ${isActive("/about") ? styles.active : ""}`}
            onClick={() => navigate("/about")}
          >
            ?מי אנחנו
          </button>

          {/* כפתור ההדרכות שלי יוצג רק אם המשתמש מדריך */}
          {isAdmin && (
            <button
              className={`${styles.navBtn} ${
                isActive("/admin") ? styles.active : ""
              }`}
              onClick={() => navigate("/admin")}
            >
             ניהול המערכת
            </button>
          )}

          {/* כפתור ההדרכות שלי יוצג רק אם המשתמש מדריך */}
          {isGuide && (
            <button
              className={`${styles.navBtn} ${
                isActive("/guide") ? styles.active : ""
              }`}
              onClick={() => navigate("/guide")}
            >
              ההדרכות שלי
            </button>
          )}
        </nav>

        {/* אזור המשתמש בצד ימין */}
        <div className={styles.userArea}>
          {/* כפתור משתמש */}
          <div className={styles.userMenu}>
            <button className={styles.userBtn} onClick={handleUserClick}>
              <FaUser size={18} />

              <span>
                {!user ? (
                  <span className={styles.fullName}>להתחבר</span>
                ) : (
                  <>
                    <span className={styles.role}>מחובר כ{user?.role}</span>
                    <br />
                    <span className={styles.fullName}>{user?.full_name}</span>
                  </>
                )}
              </span>
            </button>

            {/* התפריט הנפתח */}
            {user && (
              <div className={styles.dropdown}>
                <button onClick={() => navigate("/profile")}>פרופיל</button>

                <button onClick={() => navigate("/myRequests")}>
                  הבקשות שלי
                </button>

                <button onClick={() => navigate("/myReports")}>
                  הדיווחים שלי
                </button>
              </div>
            )}
          </div>

          {/* כפתור יציאה נשאר כמו שהוא */}
          {user && (
            <button className={styles.logoutBtn} onClick={onLogout}>
              <FaSignOutAlt size={18} />
              יציאה
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
