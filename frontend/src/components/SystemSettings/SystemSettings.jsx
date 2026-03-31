/**
 * SystemSettings.jsx
 * ------------------------------------------------
 * קומפוננטה לניהול הגדרות מערכת (מע״מ)
 */

import { useState, useEffect } from "react";
import styles from "./systemSettings.module.css";
import { FaEdit, FaTimes } from "react-icons/fa";
import API_BASE from "../../config/api";

export default function SystemSettings() {
  // ערך המע״מ
  const [vat, setVat] = useState(0);

  // מצב פתיחת מודאל
  const [showModal, setShowModal] = useState(false);

  // ערך לעריכה
  const [vatInput, setVatInput] = useState("");

  // הודעת מערכת
  const [msg, setMsg] = useState({ type: "", text: "" });

  // =========================
  // טעינת המע״מ מהשרת
  // =========================
  useEffect(() => {
    fetch(`${API_BASE}/api/SystemSettings/vat`)
      .then((res) => res.json())
      .then((data) => {
        setVat(Number(data.vat));
        setVatInput(Number(data.vat));
      })
      .catch(() => {
        setMsg({
          type: "error",
          text: "❌ שגיאה בשליפת המע״מ מהשרת",
        });
      });
  }, []);

  // =========================
  // שמירת מע״מ
  // =========================
  async function saveVat() {
    setMsg({ type: "", text: "" });

    const vatNumber = Number(vatInput);

    // בדיקת תקינות
    if (isNaN(vatNumber) || vatNumber < 0 || vatNumber > 100) {
      setMsg({
        type: "error",
        text: "❌ ערך המע״מ חייב להיות בין 0 ל־100",
      });

      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/SystemSettings/vat`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vat: vatNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg({
          type: "error",
          text: data.message || "❌ שגיאה בעדכון המע״מ",
        });

        return;
      }

      // עדכון UI
      setVat(vatNumber);

      setMsg({
        type: "success",
        text: "✅ המע״מ עודכן בהצלחה",
      });

      // סגירת המודאל אחרי רגע
      setTimeout(() => {
        setShowModal(false);
        setMsg({ type: "", text: "" });
      }, 1200);
    } catch {
      setMsg({
        type: "error",
        text: "❌ שגיאת תקשורת עם השרת",
      });
    }
  }

  return (
    <div className={styles.page} dir="rtl">
      <h1 className={styles.title}>הגדרות מערכת</h1>

      {/* טבלת הגדרות */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>הגדרה</th>
            <th>ערך</th>
            <th>פעולה</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>מע״מ</td>

            <td>{vat}%</td>

            <td>
              <button
                className={styles.editIcon}
                onClick={() => {
                  setVatInput(vat);
                  setShowModal(true);
                }}
                title="עדכן"
              >
                <FaEdit />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* מודאל עריכה */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button
              className={styles.closeIcon}
              onClick={() => {
                setShowModal(false);
                setMsg({ type: "", text: "" });
              }}
            >
              <FaTimes />
            </button>

            <h3>עדכון מע״מ</h3>

            <input
              type="number"
              min="0"
              max="100"
              value={vatInput}
              onChange={(e) => setVatInput(e.target.value)}
            />

            {/* הודעה בתוך הפופאפ */}
            {msg.text && (
              <div
                className={`${styles.formMsg} ${
                  msg.type === "success" ? styles.successMsg : styles.errorMsg
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className={styles.modalButtons}>
              <button className={styles.confirmBtn} onClick={saveVat}>
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
