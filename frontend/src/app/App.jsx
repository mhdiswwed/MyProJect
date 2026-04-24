/**
 * קובץ ראשי של האפליקציה
 * --------------------------------------------------
 * אחראי על:
 * - ניהול ניתוב בין דפים
 * - ניהול מצב התחברות משתמש
 * - בדיקת הרשאות (מחובר / מנהל)
 * - הצגת כותרת עליונה ותחתונה
 * - טיפול בהתחברות ויציאה
 */

// ייבוא קובץ עיצוב כללי
import "../styles/global.css";

// ייבוא כלים לניהול מצב והרצת פעולות בעת טעינת הקומפוננטה
import { useState, useEffect } from "react";

// ייבוא כלי ניתוב
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

// ייבוא קומפוננטות
import Header from "../components/header/Header";
import TrailNavigation from "../components/TrailNavigation/TrailNavigation";
import WelcomeAnimation from "../components/WelcomeAnimation/WelcomeAnimation";
import Footer from "../components/footer/Footer";
import About from "../components/About/About";
import Login from "../components/auth/AuthForm";
import Trails from "../components/trails/TrailCube";
import AdminLayout from "../components/AdminLayout/AdminLayout";
import TrailDetails from "../components/TrailDetails/TrailDetails";
import ScrollToTop from "../common/ScrollToTop";
import DataUpdate from "../components/DataUpdate/DataUpdate";
import ResetPassword from "../components/ResetPassword/ResetPassword";
import MyRequests from "../components/MyRequests/MyRequests";
import MyReports from "../components/MyReports/MyReports";
import ManagementTrails from "../components/ManagementTrails/ManagementTrails";
import SystemSettings from"../components/SystemSettings/SystemSettings";
import ManageRequests from "../components/ManageRequests/ManageRequests";
import UsersManagement from "../components/UsersManagement/UsersManagement";
import ManageGuidances from "../components/ManageGuidances/ManageGuidances";
import MyGuidances from "../components/MyGuidances/MyGuidances";
import MyTasks from "../components/MyTasks/MyTasks";
import RequireRole from "../components/RequireRole/RequireRole";
import ManageGroups from "../components/ManageGroups/ManageGroups";
import FieldReports from "../components/FieldReports/FieldReports";
import TaskManagement from "../components/TaskManagement/TaskManagement";
import Dashboard from "../components/Dashboard/Dashboard";
import Contact from "../components/Contact/Contact";

import API_BASE from "../config/api";
// ייבוא עיצוב מקומי
import styles from "./app.module.css";



/**
 * קומפוננטת הגנה – דורשת התחברות
 * אם המשתמש לא מחובר → מועבר לעמוד התחברות
 */
function RequireAuth({ isAuth, children }) {
  const location = useLocation();

  if (!isAuth)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  return children;
}



export default function App() {
  // כלי לניווט מתוך קוד
  const navigate = useNavigate();

  // מצב להצגת אנימציית ברוכים הבאים
  const [showWelcome, setShowWelcome] = useState(false);

  // מצב התחברות
  const [isAuth, setIsAuth] = useState(false);

  // שמירת פרטי המשתמש
  const [user, setUser] = useState(null);

  /**
   * טיפול בהתחברות מוצלחת
   * שומר את המשתמש ומציג אנימציית ברוכים הבאים
   */
  function handleLogin(userFromServer) {
    setIsAuth(true);
    setUser(userFromServer);
    setShowWelcome(true);
  }

  /**
   * בדיקה בעת טעינת האפליקציה
   * בודקת מול השרת אם המשתמש כבר מחובר
   */
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setIsAuth(true);
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  /**
   * טיפול ביציאה מהמערכת
   * שולח בקשה לשרת ומנקה את מצב המשתמש
   */
  async function handleLogout() {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    setIsAuth(false);
    setUser(null);

    navigate("/login");
  }

  return (
    <div className={styles.app}>
      {/* גלילה לראש העמוד בכל מעבר דף */}
      <ScrollToTop />

      {/* כותרת עליונה – לא מוצגת בזמן אנימציית פתיחה */}
      {!showWelcome && <Header user={user} onLogout={handleLogout} />}

      {/* אנימציית ברוכים הבאים לאחר התחברות */}
      {showWelcome && (
        <WelcomeAnimation onFinish={() => setShowWelcome(false)} />
      )}

      {/* אזור ניתוב – מוצג רק אם אין אנימציה */}
      {!showWelcome && (
        <Routes>
          {/* דף הבית – פתוח לכולם */}
          <Route path="/" element={<Trails />} />
          {/* אודות */}
          <Route path="/about" element={<About />} />
          {/* צור קשר*/}
          <Route path="/contact" element={<Contact />} />
          {/* מסלולים – פתוח לכולם */}
          <Route path="/trails" element={<Trails />} />
          {/* פרטי מסלול */}
          <Route path="/trails/:id" element={<TrailDetails user={user} />} />
          {/* התחברות */}
          <Route
            path="/login"
            element={
              isAuth ? <Navigate to="/" /> : <Login onSuccess={handleLogin} />
            }
          />
          {/* פרופיל – רק למשתמש מחובר */}
          <Route
            path="/profile"
            element={
              <RequireAuth isAuth={isAuth}>
                <DataUpdate />
              </RequireAuth>
            }
          />

          {/* נתיב הקפתור של ההליכה במסלול כולל דיווח לפי מיקום*/}
          <Route
            path="/trail-navigation/:id"
            element={<TrailNavigation user={user} />}
          />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          {/* ראוטר הבקשות של המשתמש */}
          <Route path="/myRequests" element={<MyRequests user={user} />} />
          {/* ראוטר הדיווחים של המשתמש */}
          <Route path="/myReports" element={<MyReports user={user} />} />

          {/* ראוטר של מנהל – ניהול מסלולי טיול */}
          {/* אזור ניהול – רק למנהל */}
          {/* פרופיל – רק למשתמש מחובר */}
          <Route
            path="/admin"
            element={
              <RequireRole user={user} allowedRoles={["מנהל"]}>
                <AdminLayout />
              </RequireRole>
            }
          >
            {/* ברירת מחדל - כשנכנסים ל /admin */}
            <Route index element={<Navigate to="Dashboard" replace />} />

            {/* לוח בקרה */}
            <Route path="Dashboard" element={<Dashboard />} />

            {/* שאר הראוטים */}
            <Route path="ManagementTrails" element={<ManagementTrails />} />
            <Route path="SystemSettings" element={<SystemSettings />} />
            <Route path="ManageRequests" element={<ManageRequests />} />
            <Route
              path="UsersManagement"
              element={<UsersManagement currentUser={user} />}
            />
            <Route path="ManageGuidances" element={<ManageGuidances />} />
            <Route path="ManageGroups" element={<ManageGroups />} />
            <Route path="FieldReports" element={<FieldReports />} />
            <Route path="TaskManagement" element={<TaskManagement />} />
          </Route>

          {/* אזורר מדריך רק אם מדריך מחובר */}
          <Route
            path="/guide"
            element={
              <RequireRole user={user} allowedRoles={["מדריך"]}>
                <MyGuidances user={user} />
              </RequireRole>
            }
          />

          {/* אזורר העובד רק אם העובד מחובר */}
          <Route
            path="/myTasks"
            element={
              <RequireRole user={user} allowedRoles={["עובד"]}>
                <MyTasks user={user} />
              </RequireRole>
            }
          />
        </Routes>
      )}

      {/* כותרת תחתונה */}
      <Footer prog="" year={new Date().getFullYear()} />
    </div>
  );
}
