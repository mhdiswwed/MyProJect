/**
 * AuthForm.jsx
 * --------------------------------------------------
 * קומפוננטת התחברות והרשמה
 * אותה קומפוננטה משמשת לשני המצבים:
 * - התחברות
 * - הרשמה
 *
 * אין שימוש ב־routing
 * המעבר בין המצבים מתבצע באמצעות state פנימי
 */
import logo from "../../assets/trailQuest.png";
import { useState } from "react";
import styles from "./authForm.module.css";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";

/**
 * AuthForm Component
 * @param {Function} onSuccess - פונקציה שרצה אחרי התחברות מוצלחת (מעבר לדף הבית)
 */
export default function AuthForm({ onSuccess }) {
  const navigate = useNavigate();
  // מצב הקומפוננטה: האם משתמש נמצא בהרשמה או בהתחברות
  const [isRegister, setIsRegister] = useState(false);

  // שדות משותפים להתחברות ולהרשמה
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // שדות שמופיעים רק בהרשמה
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // הודעות למשתמש
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // מצב טעינה בזמן שליחה לשרת
  const [isLoading, setIsLoading] = useState(false);

  // מצב של שכחתי סיסמה
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  /**
   * פונקציה שעושה "ניקוי" להודעות במסך
   * שימושי כדי שלא יישארו הודעות ישנות על המסך
   */
  function clearMessages() {
    setError("");
    setSuccessMessage("");
  }

  /**
   * פונקציה לבדיקת שם משתמש
   * דרישה: אותיות בלבד ולפחות 2 אותיות
   * בנוסף: ניקוי רווחים בתחילה/סוף
   */
  function isValidUsername(value) {
    const v = value.trim();
    const usernameRegex = /^[A-Za-z]{2,}$/;
    return usernameRegex.test(v);
  }

  /**
   * פונקציה לבדיקת סיסמה
   * דרישה: 3 עד 8 תווים, אלפאנומרי, לפחות אות אחת ולפחות ספרה אחת
   * בנוסף: לא מאפשר רווחים
   */
  function isValidPassword(value) {
    const v = value.trim();
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{3,8}$/;
    return passwordRegex.test(v);
  }

  /**
   * פונקציה לבדיקת שם מלא בהרשמה
   * בדיקה בסיסית: לפחות 2 תווים
   * בנוסף: שלא יהיה רק ספרות/סימנים
   */
  function isValidFullName(value) {
    const v = value.trim();
    if (v.length < 2) return false;

    // חייב להכיל לפחות אות אחת (עברית או אנגלית)
    const hasLetter = /[A-Za-zא-ת]/.test(v);
    return hasLetter;
  }

  /**
   * פונקציה לבדיקת מספר טלפון בהרשמה
   * בדיקה: מתחיל ב05 וחייב 10 מספרים ופשר - ספרות בלבד
   * בנוסף: מאפשר להקליד עם מקפים/רווחים ואז מנקה
   */
  function isValidPhone(value) {
    const cleaned = value.replace(/[\s-]/g, "");
    const phoneRegex = /^05\d{8}$/;
    return phoneRegex.test(cleaned);
  }

  /**
   * פונקציה לבדיקת אימייל בהרשמה
   * בדיקה בסיסית לאימייל
   */
  function isValidEmail(value) {
    const v = value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(v);
  }

  /**
   * פונקציה מרכזית לבדיקת תקינות הקלט
   * מחזירה הודעת שגיאה אם יש בעיה, או מחרוזת ריקה אם הכול תקין
   */
  function validate() {
    let errors = []; // מערך שגיאות

    // בדיקת שם משתמש
    if (!isValidUsername(username)) {
      errors.push(
        "שם משתמש חייב להכיל לפחות 2 אותיות באנגלית בלבד (ללא ספרות או תווים מיוחדים).",
      );
    }

    // בדיקת סיסמה
    if (!isValidPassword(password)) {
      errors.push(
        "סיסמה חייבת להיות באורך 3–8 תווים, להכיל לפחות אות אחת ולפחות ספרה אחת (אותיות וספרות בלבד)",
      );
    }

    // בדיקות נוספות רק בהרשמה
    if (isRegister) {
      if (!isValidFullName(fullName)) {
        errors.push("יש להזין שם מלא תקין (לפחות 2 תווים ושיכיל אותיות).");
      }

      if (!isValidPhone(phone)) {
        errors.push(
          "מספר טלפון לא תקין. יש להזין מספר נייד ישראלי המתחיל ב־05 ובאורך 10 ספרות.",
        );
      }

      if (!isValidEmail(email)) {
        errors.push("אימייל לא תקין. יש להזין כתובת אימייל בפורמט נכון.");
      }

      if (password !== confirmPassword) {
        errors.push("אימות סיסמה לא תואם לסיסמה.");
      }
    }

    return errors.join(" וגם "); // מחזיר מערך שגיאות
  }

  /**
   * שליחת בקשת התחברות לשרת
   * מחזירה true אם התחברות הצליחה, אחרת זורקת שגיאה עם הודעה
   */
  async function loginToServer() {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // הודעה מהשרת אם קיימת, אחרת הודעה כללית
      const msg = data?.message || "שגיאת התחברות. נסה שוב.";
      throw new Error(msg);
    }

    return data.user;
  }

  /**
   * שליחת בקשת הרשמה לשרת
   * אם הצליחה – מחזירה true
   * אם נכשל – זורקת שגיאה עם הודעה
   */
  async function registerToServer() {
    const cleanedPhone = phone.replace(/[\s-]/g, "");

    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
        fullName: fullName.trim(),
        phone: cleanedPhone,
        email: email.trim(),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.message || "שגיאת הרשמה. נסה שוב.";
      throw new Error(msg);
    }

    return true;
  }

  /**
   * שליחת בקשת איפוס סיסמה לשרת
   */
  async function forgotPasswordToServer() {
    const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.message || "שגיאה בשליחת בקשה.";
      throw new Error(msg);
    }

    return data.message;
  }

  /**
   * טיפול בשליחת הטופס
   * 1) בדיקות תקינות
   * 2) שליחה לשרת (login/register)
   * 3) הצגת הודעה מתאימה
   */
  async function handleSubmit(e) {
    e.preventDefault();
    clearMessages();

    // אם מדובר בשכחתי סיסמה – בודקים רק אימייל
    if (isForgotPassword) {
      if (!isValidEmail(email)) {
        setError("יש להזין אימייל תקין.");
        return;
      }

      setIsLoading(true);

      try {
        const message = await forgotPasswordToServer();
        setSuccessMessage(message);
      } catch (err) {
        setError(err.message || "שגיאה לא צפויה.");
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // בדיקה רגילה להרשמה / התחברות
    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsLoading(true);

    try {
      if (isRegister) {
        await registerToServer();
        setSuccessMessage("ההרשמה בוצעה בהצלחה! אפשר להתחבר.");
        setIsRegister(false);
        setFullName("");
        setPhone("");
        setEmail("");
        setConfirmPassword("");
      } else {
        const user = await loginToServer();

        // save user in app
        onSuccess(user);

        // redirect according to role
        switch (user.role) {
          case "מנהל":
            navigate("/admin");
            break;

          case "נציג קבוצה":
            navigate("/");
            break;

          case "עובד":
            navigate("/myTasks");
            break;

          case "מדריך":
            navigate("/guide");
            break;

          default:
            navigate("/");
        }
      }
    } catch (err) {
      setError(err.message || "שגיאה לא צפויה. נסה שוב.");
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * מעבר בין מצב התחברות למצב הרשמה
   * מנקה הודעות כדי לא לבלבל את המשתמש
   */
  function toggleMode() {
    clearMessages();

    setIsRegister(!isRegister);

    // 🔥 תיקון חשוב
    setIsForgotPassword(false);
  }

  return (
    <div className={styles.wrapper}>
      {/* שכבת טעינה בזמן שליחה לשרת */}
      {isLoading && (
        <div className={styles.overlay}>
          <div className={styles.loaderBox}>
            <div className={styles.spinner}></div>
            <p>מתבצע חיבור לשרת, אנא המתן…</p>
          </div>
        </div>
      )}

      {/* כותרת */}

      <img src={logo} alt="Trail Quest" className={styles.titleLogo} />
      <h2>
        {isForgotPassword ? "שחזור סיסמה" : isRegister ? "הרשמה" : "התחברות"}
      </h2>

      {/* הודעת הצלחה */}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      {/* הודעת שגיאה */}
      {error && <div className={styles.error}>{error}</div>}

      {/* הטופס */}
      <form onSubmit={handleSubmit}>
        {/* שדות הרשמה בלבד */}
        {isRegister && (
          <>
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="tel"
              placeholder="טלפון"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <input
              type="text"
              placeholder="שם מלא"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </>
        )}

        {/* אם שכחתי סיסמה – רק אימייל */}
        {isForgotPassword ? (
          <input
            type="email"
            placeholder="אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        ) : (
          <>
            <input
              type="text"
              placeholder="שם משתמש"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}

        {/* אימות סיסמה – הרשמה בלבד */}
        {isRegister && (
          <input
            type="password"
            placeholder="אימות סיסמה"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        )}

        <button type="submit" className={styles.submitButton}>
          {isForgotPassword
            ? "שלח קישור איפוס"
            : isRegister
              ? "הרשמה"
              : "התחברות"}
        </button>
      </form>

      {/* כפתור מעבר בין מצבים */}
      <button className={styles.switch} onClick={toggleMode}>
        {isRegister ? "כבר רשום? התחבר" : "אין משתמש? הרשמה"}
      </button>

      {!isRegister && !isForgotPassword && (
        <button
          className={styles.switch}
          onClick={() => {
            clearMessages();
            setIsForgotPassword(true);
          }}
        >
          שכחת סיסמה?
        </button>
      )}

      {isForgotPassword && (
        <button
          className={styles.switch}
          onClick={() => {
            clearMessages();
            setIsForgotPassword(false);
          }}
        >
          חזרה להתחברות
        </button>
      )}
    </div>
  );
}
