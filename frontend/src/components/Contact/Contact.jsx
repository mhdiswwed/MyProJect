/**
 * Contact.jsx
 * --------------------------------------------------
 * קומפוננטת צור קשר עם שגיאות לכל שדה בנפרד
 */

import logo from "../../assets/trailQuest.png";
import { useState } from "react";
import styles from "./contact.module.css";
import API_BASE from "../../config/api";

export default function Contact() {
  /* ===============================
     state – שדות
  =============================== */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  /* שגיאות לכל שדה */
  const [errors, setErrors] = useState({});

  /* הצלחה */
  const [successMessage, setSuccessMessage] = useState("");

  /* טעינה */
  const [isLoading, setIsLoading] = useState(false);

  function clearMessages() {
    setErrors({});
    setSuccessMessage("");
  }

  /* ===============================
     בדיקות
  =============================== */
  function validate() {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "נא למלא שם מלא";
    }

    if (!email.trim()) {
      newErrors.email = "נא למלא אימייל";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "אימייל לא תקין";
    }

    if (!phone.trim()) {
      newErrors.phone = "נא למלא טלפון";
    } else if (!/^05\d{8}$/.test(phone.replace(/[\s-]/g, ""))) {
      newErrors.phone = "טלפון לא תקין";
    }

    if (!message.trim()) {
      newErrors.message = "נא למלא הערות";
    }

    return newErrors;
  }

  /* ===============================
     שליחה
  =============================== */
  async function handleSubmit(e) {
    e.preventDefault();
    clearMessages();

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/contact/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          address,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.message);

      setSuccessMessage("ההודעה נשלחה בהצלחה");

      /* ניקוי */
      setFullName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setMessage("");
    } catch (err) {
      setErrors({ general: err.message || "שגיאת שרת" });
    } finally {
      setIsLoading(false);
    }
  }

  /* ===============================
     UI
  =============================== */
  return (
    <div className={styles.wrapper}>
      {isLoading && (
        <div className={styles.overlay}>
          <div className={styles.loaderBox}>
            <div className={styles.spinner}></div>
            <p>שולח הודעה…</p>
          </div>
        </div>
      )}

      <img src={logo} alt="Logo" className={styles.titleLogo} />
      <h2>שלחו לנו הודעה</h2>

      {successMessage && <div className={styles.success}>{successMessage}</div>}
      {errors.general && <div className={styles.error}>{errors.general}</div>}

      <form onSubmit={handleSubmit}>
        {/* שם מלא */}
        <div>
          <input
            placeholder="שם מלא"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          {errors.fullName && (
            <div className={styles.fieldError}>{errors.fullName}</div>
          )}
        </div>

        {/* אימייל */}
        <div>
          <input
            placeholder="דואר אלקטרוני"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && (
            <div className={styles.fieldError}>{errors.email}</div>
          )}
        </div>

        {/* טלפון */}
        <div>
          <input
            placeholder="נייד"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {errors.phone && (
            <div className={styles.fieldError}>{errors.phone}</div>
          )}
        </div>

        {/* כתובת */}
        <div>
          <input
            placeholder="כתובת"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* הערות */}
        <div>
          <textarea
            placeholder="הערות"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {errors.message && (
            <div className={styles.fieldError}>{errors.message}</div>
          )}
        </div>

        <button type="submit" className={styles.submitButton}>
          שלח
        </button>
      </form>
    </div>
  );
}
