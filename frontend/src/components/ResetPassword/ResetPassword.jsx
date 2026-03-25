/**
 * ResetPassword.jsx
 * --------------------------------------------------
 * קומפוננטה לאיפוס סיסמה
 *
 * התהליך:
 * 1. המשתמש מגיע דרך קישור מהמייל (כולל token)
 * 2. מזין סיסמה חדשה + אימות סיסמה
 * 3. נשלחת בקשה לשרת לעדכון הסיסמה
 * 4. אם הצליח – מוצגת הודעה ומעבר לדף התחברות
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import styles from "./resetPassword.module.css";
import logo from "../../assets/trailQuest.png";
import API_BASE from "../../config/api";

export default function ResetPassword() {
  // שליפת הטוקן מה-URL
  const { token } = useParams();
  const navigate = useNavigate();

  // שדות טופס
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // הודעות למשתמש
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // מצב טעינה
  const [isLoading, setIsLoading] = useState(false);

  /**
   * בדיקת תקינות סיסמה חדשה
   * דרישה:
   * - 3 עד 8 תווים
   * - לפחות אות אחת
   * - לפחות ספרה אחת
   */
  function isValidPassword(value) {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{3,8}$/;
    return passwordRegex.test(value.trim());
  }

  /**
   * שליחת סיסמה חדשה לשרת
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // בדיקות בצד לקוח
    if (!isValidPassword(password)) {
      setError("הסיסמה חייבת להיות 3–8 תווים, עם לפחות אות אחת וספרה אחת.");
      return;
    }

    if (password.trim() !== confirmPassword.trim()) {
      setError("אימות סיסמה לא תואם לסיסמה החדשה.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: password.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "אירעה שגיאה באיפוס הסיסמה.");
      }

      // הצלחה
      setSuccessMessage("הסיסמה עודכנה בהצלחה! מעביר להתחברות...");

      // מעבר אוטומטי לדף התחברות
      setTimeout(() => {
        // אם דף ההתחברות אצלך בנתיב אחר, החלף פה:
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      setError(err.message || "אירעה שגיאה.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <img src={logo} alt="Trail Quest" className={styles.titleLogo} />
      <h2>הגדרת סיסמה חדשה</h2>

      {error && <div className={styles.error}>{error}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="סיסמה חדשה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="אימות סיסמה"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? "שומר..." : "שמור סיסמה"}
        </button>

        {/* כפתור חזרה ידני */}
        <button
          type="button"
          className={styles.switch}
          onClick={() => navigate("/login", { replace: true })}
          disabled={isLoading}
        >
          חזרה להתחברות
        </button>
      </form>
    </div>
  );
}
