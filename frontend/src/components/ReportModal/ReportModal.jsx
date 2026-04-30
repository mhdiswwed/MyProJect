/**====================================================================
 ReportModal
צד עובד- מודאל דיווח משימה – מאפשר להזין הערות ולהעלות תמונה, מבצע ולידציה ושולח דיווח לשרת עם הודעת הצלחה או שגיאה
 =====================================================================*/

import { useState } from "react";
import styles from "./reportModal.module.css";
import API_BASE from "../../config/api";

export default function ReportModal({ task, user, onClose, onSuccess }) {
  // סטייט לדיווח
  const [note, setNote] = useState("");
  const [image, setImage] = useState(null);
  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * שליחת דיווח לשרת
   */
async function sendReport() {
  setMsg("");
  setIsSuccess(false);
  const errors = [];

  // בדיקה אם חסרות הערות
  if (!note) {
    errors.push("חייב למלא הערות");
  }

  // בדיקה אם חסרה תמונה
  if (!image) {
    errors.push("חייב להעלות תמונה");
  }

  // אם יש שגיאות - מציג הכל בהודעה אחת
  if (errors.length > 0) {
    setMsg(errors.join(" וגם "));
    setIsSuccess(false);
    return;
  }

  const formData = new FormData();
  formData.append("note", note);
  formData.append("image", image);
  formData.append("task_id", task.task_id);
  formData.append("user_id", user.user_id);

  try {
    const res = await fetch(`${API_BASE}/api/ReportModal/report`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

if (!res.ok) {
  setMsg(data.message || "שגיאה");
    setIsSuccess(false);
  return;
}

// הודעת הצלחה
setMsg("הדיווח נשלח בהצלחה");
  setIsSuccess(true);
// מחכה 2 שניות
setTimeout(() => {
  onSuccess(); // רענון
  onClose(); // סגירה
}, 2200);

  } catch {
    setMsg("שגיאת שרת");
      setIsSuccess(false);
  }
}

  return (
    <div className={styles.modalOverlay}>
      {/* חלון מודאל */}
      <div className={styles.modal}>
        <h2>דיווח סיום משימה</h2>

        {/* הערות */}
        <div className={styles.reportSection}>
          <label className={styles.reportLabel}>הערות</label>
          <textarea
            className={styles.reportTextarea}
            placeholder="כתוב מה עשית..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* תמונה */}
        <div className={styles.reportSection}>
          <label className={styles.reportLabel}>העלה תמונה</label>
          <input
            className={styles.reportFile}
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
          />
        </div>

        {/* הודעה */}
        {msg && (
          <div
            className={`${styles.inlineMsg} ${
              isSuccess ? styles.inlineSuccess : styles.inlineError
            }`}
          >
            {msg}
          </div>
        )}

        {/* כפתורים */}
        <div className={styles.modalActions}>
          <button className={styles.saveBtn} onClick={sendReport}>
            שלח
          </button>

          <button
            className={styles.closeBtn}
            onClick={() => {
              onSuccess(); // 🔄 רענון
              onClose(); // ❌ סגירה
            }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
