/**
 * DataUpdate.jsx
 * --------------------------------------------------
 * קומפוננטה לעריכת פרטי משתמש מחובר
 *
 * תפקידה:
 * - למשוך נתוני משתמש מהשרת (session)
 * - להציג בטופס
 * - לאפשר עדכון חלקי (לא חייבים למלא הכול)
 * - לאפשר שינוי סיסמה עם בדיקות כמו בהרשמה
 */

import logo from "../../assets/trailQuest.png";
import { useEffect, useState } from "react";
import styles from "./dataUpdate.module.css";
import API_BASE from "../../config/api";

export default function DataUpdate({ onSuccess }) {
  /* ===============================
     state – נתוני משתמש
  =============================== */
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  /* סיסמה חדשה + אימות */
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /* הודעות */
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /* מצב טעינה */
  const [isLoading, setIsLoading] = useState(false);

  /* ===============================
     ניקוי הודעות
  =============================== */
  function clearMessages() {
    setError("");
    setSuccessMessage("");
  }

  /* ===============================
     קריאת JSON בטוחה
  =============================== */
  async function parseJsonSafe(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  /* ===============================
     פונקציות עזר לבדיקות
  =============================== */

  // בדיקת שם משתמש (כמו בהרשמה)
  function isValidUsername(value) {
    const v = value.trim();
    return /^[A-Za-z]{2,}$/.test(v);
  }

  // בדיקת סיסמה (כמו בהרשמה)
  function isValidPassword(value) {
    const v = value.trim();
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{3,8}$/;
    return regex.test(v);
  }

  // בדיקת טלפון
  function isValidPhone(value) {
    const cleaned = value.replace(/[\s-]/g, "");
    return /^05\d{8}$/.test(cleaned);
  }

  // בדיקת אימייל
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  // בדיקת שם מלא
  function isValidFullName(value) {
    const v = value.trim();
    return v.length >= 2 && /[A-Za-zא-ת]/.test(v);
  }

  /* ===============================
     טעינת נתוני המשתמש מהשרת
  =============================== */
  useEffect(() => {
    (async () => {
      clearMessages();
      setIsLoading(true);

      try {
        const res = await fetch(`${API_BASE}/api/DataUpdate/me`, {
          credentials: "include",
        });

        const data = await parseJsonSafe(res);

        if (!res.ok) throw new Error(data?.message);

        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
      } catch (err) {
        setError(err.message || "שגיאת שרת");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /* ===============================
     בדיקות תקינות לפני שליחה
  =============================== */
  function validate() {
    if (!isValidUsername(username)) {
      return "שם משתמש חייב להכיל לפחות 2 אותיות באנגלית בלבד";
    }

    if (fullName && !isValidFullName(fullName)) {
      return "שם מלא לא תקין";
    }

    if (phone && !isValidPhone(phone)) {
      return "מספר טלפון לא תקין";
    }

    if (email && !isValidEmail(email)) {
      return "אימייל לא תקין";
    }

    // בדיקות סיסמה – רק אם המשתמש רוצה לשנות
    if (password) {
      if (!isValidPassword(password)) {
        return "סיסמה חייבת להיות באורך 3–8 תווים ולהכיל אות וספרה";
      }

      if (password !== confirmPassword) {
        return "אימות סיסמה לא תואם";
      }
    }

    return "";
  }

  /* ===============================
     שליחת עדכון לשרת
  =============================== */
  async function handleSubmit(e) {
    e.preventDefault();
    clearMessages();

    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/DataUpdate/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username,
          fullName,
          phone,
          email,
          ...(password ? { password } : {}),
        }),
      });

      const data = await parseJsonSafe(res);

      if (!res.ok) throw new Error(data?.message);

      setSuccessMessage(data?.message || "הפרטים עודכנו בהצלחה");

      // ניקוי שדות סיסמה
      setPassword("");
      setConfirmPassword("");

      if (data?.user) onSuccess?.(data.user);
    } catch (err) {
      setError(err.message || "שגיאת שרת");
    } finally {
      setIsLoading(false);
    }
  }

  /* ===============================
     תצוגה
  =============================== */
  return (
    <div className={styles.wrapper}>
      {isLoading && (
        <div className={styles.overlay}>
          <div className={styles.loaderBox}>
            <div className={styles.spinner}></div>
            <p>מתבצע עדכון, אנא המתן…</p>
          </div>
        </div>
      )}

      <img src={logo} alt="Trail Quest" className={styles.titleLogo} />
      <h2>עריכת פרופיל</h2>

      {successMessage && <div className={styles.success}>{successMessage}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="שם משתמש"
        />
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="שם מלא"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="טלפון"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="אימייל"
        />

        <input
          type="password"
          placeholder="סיסמה חדשה (לא חובה)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {password && (
          <input
            type="password"
            placeholder="אימות סיסמה חדשה"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        )}

        <button type="submit" className={styles.submitButton}>
          עדכון
        </button>
      </form>
    </div>
  );
}
