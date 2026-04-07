// ===================================
// קומפוננטה חלון פופה ליצירת משימה חדשה
// תומך ב-2 מצבים:
// 1. report - מתוך דיווח
// 2. manual - יצירה ידנית ע"י מנהל
// ===================================

import { useEffect, useState } from "react";
import styles from "./createTaskModal.module.css";
import API_BASE from "../../config/api";

export default function CreateTaskModal({
  report,
  mode = "report",
  onClose,
  onSuccess,
}) {
  // =========================
  // state
  // =========================
const [taskType, setTaskType] = useState(report?.problem_type || "");
const [description, setDescription] = useState(report?.description || "");
const [image, setImage] = useState(report?.image_path || "");

  const [startTime, setStartTime] = useState("");
  const [dueTime, setDueTime] = useState("");

  const [workers, setWorkers] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);

  const [msg, setMsg] = useState({ type: "", text: "" });
  // =========================
  // מסלולים (רק למנהל)
  // =========================
  const [trails, setTrails] = useState([]);
  const [selectedTrail, setSelectedTrail] = useState("");

  // =========================
  // טעינת מסלולים רק במצב manual
  // =========================
  useEffect(() => {
    if (mode !== "manual") return;

    fetch(`${API_BASE}/api/ManagementTrails`)
      .then((res) => res.json())
      .then((data) => setTrails(data))
      .catch(() => setTrails([]));
  }, [mode]);

  // =========================
  // טעינת עובדים לפי זמן שנבחר
  // =========================
  useEffect(() => {
    loadWorkers();
  }, [startTime, dueTime]);

  async function loadWorkers() {
    if (!startTime || !dueTime) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/CreateTaskModal/workers?start_time=${startTime}&due_time=${dueTime}`,
      );

      const data = await res.json();
      setWorkers(data);
    } catch {
      setMsg({ type: "error", text: "שגיאה בטעינת עובדים" });
    }
  }
  // =========================
  // בחירת עובדים
  // =========================
  function handleSelectWorker(e) {
    const userId = Number(e.target.value);

    if (!userId) return;

    // לא להוסיף פעמיים
    if (selectedWorkers.find((w) => w.user_id === userId)) return;

    setSelectedWorkers([...selectedWorkers, { user_id: userId, role: "" }]);
  }

  // שינוי תפקיד
  function handleRoleChange(userId, role) {
    setSelectedWorkers((prev) =>
      prev.map((w) => (w.user_id === userId ? { ...w, role } : w)),
    );
  }

  // מחיקת עובד
  function removeWorker(userId) {
    setSelectedWorkers((prev) => prev.filter((w) => w.user_id !== userId));
  }

  // =========================
  // ולידציה
  // =========================
  // =========================
  // ולידציה משופרת - מחזירה כמה שגיאות
  // =========================
  function validate() {
    const errors = []; // מערך שגיאות

    // בדיקות בסיסיות
    if (!taskType) errors.push("חסר סוג משימה");
    if (!description) errors.push("חסר תיאור");
    // חובה תמונה רק אם זה מדיווח
    if (mode === "report" && !image) {
      errors.push("חסר תמונה");
    }
    if (!startTime) errors.push("חסר זמן התחלה");
    if (!dueTime) errors.push("חסר זמן סיום");

    // בדיקת שעות עבודה
    if (startTime && !isValidWorkHour(startTime)) {
      errors.push("זמן התחלה חייב להיות בין 08:00 ל־18:00");
    }

    if (dueTime && !isValidWorkHour(dueTime)) {
      errors.push("זמן סיום חייב להיות בין 08:00 ל־18:00");
    }

    // התחלה לא יכולה להיות בעבר / היום
    if (startTime && !isValidMinDate(startTime)) {
      errors.push("זמן התחלה חייב להיות לפחות 12 שעות מהיום");
    }

    // סיום גם
    if (dueTime && !isValidMinDate(dueTime)) {
      errors.push("זמן סיום חייב להיות לפחות 12 שעות מהיום");
    }
    // בדיקת זמנים
    if (startTime && dueTime) {
      if (new Date(startTime) >= new Date(dueTime)) {
        errors.push("זמן התחלה חייב להיות לפני זמן סיום");
      }
    }

    // עובדים
    if (selectedWorkers.length === 0) {
      errors.push("חייב לבחור לפחות עובד אחד");
    }

    // תפקידים
    selectedWorkers.forEach((w) => {
      if (!w.role) {
        errors.push("חייב לבחור תפקיד לכל עובד");
      }
    });

    // חובה לבחור מסלול אם זה מצב מנהל
    if (mode === "manual" && !selectedTrail) {
      errors.push("חייב לבחור מסלול");
    }

    return errors;
  }

  // =========================
  // יצירת משימה
  // =========================
  async function createTask() {
    const errors = validate();

    // אם יש שגיאות
    if (errors.length > 0) {
      setMsg({
        type: "error",
        text: errors.join(" וגם "), //  מחבר הכל להודעה אחת
      });
      return;
    }

try {
  const formData = new FormData();

  // אותם שדות בדיוק
  formData.append("task_type", taskType);
  formData.append("description", description);

  // אם זה יצירה ידנית  שולחים קובץ
  if (mode === "manual" && image) {
    formData.append("image", image);
  }

  // אם זה מתוך דיווח שולחים את הנתיב של התמונה הקיימת
  if (mode === "report") {
    formData.append("image", report.image_path);
  }

  formData.append("start_time", startTime);
  formData.append("due_time", dueTime);
  formData.append("report_id", mode === "report" ? report.report_id : "");
  formData.append("latitude", mode === "report" ? report.latitude : "");
  formData.append("longitude", mode === "report" ? report.longitude : "");
 if (mode === "manual" && selectedTrail) {
   formData.append("trail_id", selectedTrail);
 }
  formData.append("workers", JSON.stringify(selectedWorkers));

  const res = await fetch(`${API_BASE}/api/CreateTaskModal/tasks`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();

  setMsg({
    type: res.ok ? "success" : "error",
    text: data.message,
  });

  if (res.ok) {
    setTimeout(() => {
      onClose();
      onSuccess();
    }, 2200);
  }
} catch {
  setMsg({ type: "error", text: "שגיאה ביצירת משימה" });
}
  }

  // =========================
  // בדיקת שעות עבודה (08:00 - 18:00)
  // =========================
  function isValidWorkHour(dateStr) {
    const date = new Date(dateStr);

    const hour = date.getHours();
    const minutes = date.getMinutes();

    // לפני 08:00
    if (hour < 8) return false;

    // אחרי 18:00
    if (hour > 18) return false;

    // אם זה 18:00 בדיוק
    if (hour === 18 && minutes > 0) return false;

    return true;
  }

  // =========================
  // מחשב זמן מינימלי - 12 שעות קדימה
  // =========================
  function getMinDateTime() {
    const now = new Date();
    // מוסיף 12 שעות
    now.setHours(now.getHours() + 12);
    // פורמט מתאים ל-input
    return now.toISOString().slice(0, 16);
  }

  // =========================
  // בדיקת זמן מינימלי (12 שעות קדימה)
  // =========================
  function isValidMinDate(dateStr) {
    const now = new Date();
    // מוסיף 24 שעות
    now.setHours(now.getHours() + 12);
    return new Date(dateStr) >= now;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} dir="rtl">
        <h2>יצירת משימה חדשה</h2>
        {/* סוג משימה */}
        <label className={styles.label}>סוג משימה</label>
        <select
          className={styles.input}
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
        >
          <option value="">בחר סוג משימה</option>
          <option value="סכנה">סכנה</option>
          <option value="חסימה">חסימה</option>
          <option value="תחזוקה">תחזוקה</option>
          <option value="ניקיון">ניקיון</option>
        </select>

        {/* =========================
         בחירת מסלול (רק למנהל)
        ========================= */}
        {mode === "manual" && (
          <>
            <label className={styles.label}>בחר מסלול</label>

            <select
              className={styles.input}
              value={selectedTrail}
              onChange={(e) => setSelectedTrail(e.target.value)}
            >
              <option value="">בחר מסלול</option>

              {trails.map((t) => (
                <option key={t.trail_id} value={t.trail_id}>
                  {t.trail_name}
                </option>
              ))}
            </select>
          </>
        )}
        {/* תיאור */}
        <label className={styles.label}>תיאור</label>
        <textarea
          className={styles.input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תיאור..."
        />
        {/* =========================
   תמונה (רק במצב ידני)
========================= */}
        {mode === "manual" && (
          <>
            <label className={styles.label}>תמונה (אופציונלי)</label>

            <input
              type="file"
              accept="image/*"
              className={styles.input}
              onChange={(e) => setImage(e.target.files[0])}
            />
          </>
        )}
        {/* תמונה */}
        {image && (
          <img
            src={`${API_BASE}/${image}`}
            className={styles.imagePreview}
            alt=""
          />
        )}
        {/* זמנים */}
        {/*// ========================= // זמן התחלה // =========================*/}
        <label className={styles.label}>זמן התחלה</label>
        <input
          type="datetime-local"
          className={styles.input}
          min={getMinDateTime()} // ❗ חוסם עבר + היום
          onChange={(e) => setStartTime(e.target.value)}
        />
        {/*// ========================= // זמן סיום // =========================*/}
        <label className={styles.label}>זמן סיום</label>
        <input
          type="datetime-local"
          className={styles.input}
          min={getMinDateTime()}
          onChange={(e) => setDueTime(e.target.value)}
        />
        {/* עובדים */}
        <select className={styles.input} onChange={handleSelectWorker}>
          <option value="">בחר עובד</option>
          {workers.map((w) => (
            <option key={w.user_id} value={w.user_id}>
              {w.full_name}
            </option>
          ))}
        </select>
        {/* עובדים שנבחרו */}
        {selectedWorkers.map((w) => {
          const worker = workers.find((x) => x.user_id === w.user_id);

          return (
            <div key={w.user_id} className={styles.workerRow}>
              <span>{worker?.full_name}</span>

              <select
                className={styles.roleSelect}
                onChange={(e) => handleRoleChange(w.user_id, e.target.value)}
              >
                <option value="">בחר תפקיד</option>
                <option value="מבצע">מבצע</option>
                <option value="אחראי">אחראי</option>
                <option value="מפקח">מפקח</option>
              </select>

              <button
                className={styles.removeBtn}
                onClick={() => removeWorker(w.user_id)}
              >
                ✖
              </button>
            </div>
          );
        })}
        {/* הודעה */}
        {msg.text && (
          <div
            className={`${styles.inlineMsg} ${
              msg.type === "success" ? styles.inlineSuccess : styles.inlineError
            }`}
          >
            {msg.text}
          </div>
        )}
        {/* כפתורים */}
        <div className={styles.modalActions}>
          <button className={styles.saveBtn} onClick={createTask}>
            צור משימה
          </button>

          <button className={styles.closeBtn} onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
