/**===================================================================
SystemSettings
קומפוננטה לניהול והגדרת פרמטרים מערכתיים (כמו מע״מ, משתתפים, זמני עבודה וכו׳), כולל עריכה דרך מודאל, בדיקות תקינות ושליחה לשרת עם עדכון בזמן אמת
 ====================================================================*/

import { useState, useEffect } from "react";
import styles from "./systemSettings.module.css";
import { FaEdit, FaTimes } from "react-icons/fa";
import API_BASE from "../../config/api";

export default function SystemSettings() {
  // מצב פתיחת מודאל
  const [showModal, setShowModal] = useState(false);

  // הודעת מערכת
  const [msg, setMsg] = useState({ type: "", text: "" });

  // שמירת כל ההגדרות מהשרת כאובייקט
  const [settings, setSettings] = useState({});

  // שמירת שם ההגדרה הנוכחית לעריכה (לדוגמה: vat)
  const [currentKey, setCurrentKey] = useState("");

  // שמירת הערך שמכניסים במודאל
  const [inputValue, setInputValue] = useState("");
  //מינימום אנשים משתתפים בטיול
  const [minValue, setMinValue] = useState("");
  //מקסימום אנשים משתתפים בטיול
  const [maxValue, setMaxValue] = useState("");
  // שעת התחלה של המערכת
  const [startHour, setStartHour] = useState("");

  // שעת סיום של המערכת
  const [endHour, setEndHour] = useState("");

  //==================================
  //שליפת כל הנתונים
  //=================================
  useEffect(() => {
    // שליחת בקשה לשרת לשליפת כל ההגדרות
    fetch(`${API_BASE}/api/SystemSettings`)
      .then((res) => res.json()) // המרת התשובה ל־JSON
      .then((data) => {
        // שמירת הנתונים ב־state
        setSettings(data);
      })
      .catch(() => {
        // במקרה של שגיאה
        setMsg({ type: "error", text: " שגיאה בטעינת ההגדרות" });
      });
  }, []);

  //=====================
  // פונקציה ראשית – מחליטה איזה סוג הגדרה לשמור
  //=====================
  async function saveSetting() {
    setMsg({ type: "", text: "" });

    try {
      if (currentKey === "working_hours") {
        await handleWorkingHours();
        return;
      }

      if (currentKey === "participants") {
        await handleParticipants();
        return;
      }

      // כל שאר ההגדרות
      await handleGeneralSetting();
    } catch {
      setMsg({ type: "error", text: "שגיאת שרת" });
    }
  }

  //=====================
  // מטפלת בשעות פעילות:
  // - בדיקת תקינות שעות
  // - שליחה לשרת
  // - עדכון המסך
  //=====================
  async function handleWorkingHours() {
    if (startHour >= endHour) {
      setMsg({ type: "error", text: "שעת התחלה חייבת להיות לפני שעת סיום" });
      return;
    }

    await fetch(`${API_BASE}/api/SystemSettings/working_hours_start`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: startHour }),
    });

    await fetch(`${API_BASE}/api/SystemSettings/working_hours_end`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: endHour }),
    });

    setSettings((prev) => ({
      ...prev,
      working_hours_start: startHour,
      working_hours_end: endHour,
    }));

    success();
  }

  //=====================
  // מטפלת בכמות משתתפים:
  // - בדיקות תקינות (מספרים, טווח)
  // - שליחה לשרת
  // - עדכון המסך
  //=====================
  async function handleParticipants() {
    const min = Number(minValue);
    const max = Number(maxValue);

    if (isNaN(min) || isNaN(max)) {
      setMsg({ type: "error", text: "ערכים לא תקינים" });
      return;
    }

    if (min > max) {
      setMsg({ type: "error", text: "מינימום לא יכול להיות גדול ממקסימום" });
      return;
    }

    if (min < 0 || max < 0) {
      setMsg({ type: "error", text: "לא ניתן להכניס ערך שלילי" });
      return;
    }

    await fetch(`${API_BASE}/api/SystemSettings/min_participants`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: min }),
    });

    await fetch(`${API_BASE}/api/SystemSettings/max_participants`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: max }),
    });

    setSettings((prev) => ({
      ...prev,
      min_participants: min,
      max_participants: max,
    }));

    success();
  }

  //=====================
  // מטפלת בשאר ההגדרות:
  // - המרה למספר
  // - בדיקות לפי סוג
  // - שליחה לשרת
  //=====================
  async function handleGeneralSetting() {
    const num = Number(inputValue);

    if (isNaN(num)) {
      setMsg({ type: "error", text: "ערך לא תקין" });
      return;
    }

    if (currentKey === "vat" && (num < 0 || num > 100)) {
      setMsg({ type: "error", text: "מע״מ בין 0 ל-100" });
      return;
    }

  if (
    (currentKey === "max_reports_per_route" ||
      currentKey === "report_interval_minutes" ||
      currentKey === "guide_break_minutes" ||
      currentKey === "worker_break_minutes") &&
    num < 0
  ) {
    setMsg({ type: "error", text: "לא ניתן להכניס ערך שלילי" });
    return;
  }

const res = await fetch(`${API_BASE}/api/SystemSettings/${currentKey}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ value: num }),
});

const data = await res.json();

if (!res.ok) {
  setMsg({ type: "error", text: data.message });
  return;
}

setSettings((prev) => ({
  ...prev,
  [currentKey]: num,
}));

success();
  }

  //=====================
  // מציגה הודעת הצלחה וסוגרת את החלון
  //=====================
  function success() {
    setMsg({ type: "success", text: "עודכן בהצלחה" });
    setTimeout(() => setShowModal(false), 1200);
  }

  //===================================
  // פונקציה שמחזירה כותרת לפי סוג ההגדרה
  //===================================
  function getSettingTitle(key) {
    // בדיקה לפי שם ההגדרה
    switch (key) {
      case "vat":
        return "עדכון מע״מ";

      case "max_reports_per_route":
        return "עדכון כמות דיווחים למסלול";

      case "report_interval_minutes":
        return "עדכון זמן בין דיווחים (בדקות)";

      case "participants":
        return "עדכון משתתפים בטיול";

      // הפסקה בין טיולים למדריך
      case "guide_break_minutes":
        return "עדכון הפסקה בין טיולים למדריך";

      // הפסקה בין משימות לעובד
      case "worker_break_minutes":
        return "עדכון הפסקה בין משימות לעובד";

      // שעות פעילות מערכת
      case "working_hours":
        return "עדכון שעות פעילות המערכת";

      default:
        return "עדכון הגדרה";
    }
  }
  //===================================
  // פונקציה שמחזירה placeholder מתאים
  //==================================
  function getPlaceholder(key) {
    switch (key) {
      case "vat":
        return "הכנס אחוז מע״מ (0-100)";

      case "max_reports_per_route":
        return "הכנס מספר דיווחים מקסימלי";

      case "report_interval_minutes":
        return "הכנס זמן בדקות";

      default:
        return "הכנס ערך";
    }
  }

  return (
    <div className={styles.page} dir="rtl">
      <h1 className={styles.title}>הגדרות מערכת</h1>

      {/* טבלת הגדרות */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>הגדרה</th>
              <th>ערך</th>
              <th>פעולה</th>
            </tr>
          </thead>

          <tbody>
            {/* שורת מע״מ */}
            <tr>
              <td>מע״מ</td>

              <td>{settings.vat}%</td>

              <td>
                <button
                  className={styles.editIcon}
                  onClick={() => {
                    // שמירת שם ההגדרה
                    setCurrentKey("vat");

                    // הכנסת הערך הנוכחי לשדה
                    setInputValue(settings.vat);

                    // פתיחת מודאל
                    setShowModal(true);
                  }}
                >
                  <FaEdit />
                </button>
              </td>
            </tr>

            {/* כמות דיווחים */}
            <tr>
              <td>כמות דיווחים אפשרית למסלול</td>

              <td>{settings.max_reports_per_route} דיווחים</td>

              <td>
                <button
                  className={styles.editIcon}
                  onClick={() => {
                    setCurrentKey("max_reports_per_route");
                    setInputValue(settings.max_reports_per_route);
                    setShowModal(true);
                  }}
                >
                  <FaEdit />
                </button>
              </td>
            </tr>

            {/* זמן בין דיווחים */}
            <tr>
              <td>זמן בין דיווחים (דקות)</td>

              <td>{settings.report_interval_minutes} דקות</td>

              <td>
                <button
                  className={styles.editIcon}
                  onClick={() => {
                    setCurrentKey("report_interval_minutes");
                    setInputValue(settings.report_interval_minutes);
                    setShowModal(true);
                  }}
                >
                  <FaEdit />
                </button>
              </td>
            </tr>

            {/* כמות משתתפים בטיול( מינימום ומקסימום )*/}
            <tr>
              <td>כמות משתתפים בטיול</td>

              <td>
                מינימום: {settings.min_participants} | מקסימום:{" "}
                {settings.max_participants}
              </td>

              <td>
                <button
                  className={styles.editIcon}
                  onClick={() => {
                    setCurrentKey("participants"); // מפתח מיוחד
                    setMinValue(settings.min_participants);
                    setMaxValue(settings.max_participants);
                    setShowModal(true);
                  }}
                >
                  <FaEdit />
                </button>
              </td>
            </tr>

            <tr>
              <td>הפסקה בין טיולים למדריך</td>

              <td>{settings.guide_break_minutes} דקות</td>

              <td>
                <button
                  className={styles.editIcon}
                  onClick={() => {
                    setCurrentKey("guide_break_minutes");
                    setInputValue(settings.guide_break_minutes);
                    setShowModal(true);
                  }}
                >
                  <FaEdit />
                </button>
              </td>
            </tr>

            <tr>
              <td>הפסקה בין משימות לעובד</td>

              <td>{settings.worker_break_minutes} דקות</td>

              <td>
                <button
                  className={styles.editIcon}
                  onClick={() => {
                    setCurrentKey("worker_break_minutes");
                    setInputValue(settings.worker_break_minutes);
                    setShowModal(true);
                  }}
                >
                  <FaEdit />
                </button>
              </td>
            </tr>
            <tr>
              <td>שעות פעילות מערכת</td>

              <td>
                {settings.working_hours_start} - {settings.working_hours_end}
              </td>

              <td>
                <button
                  className={styles.editIcon}
                  onClick={() => {
                    setCurrentKey("working_hours");
                    setStartHour(settings.working_hours_start);
                    setEndHour(settings.working_hours_end);
                    setShowModal(true);
                  }}
                >
                  <FaEdit />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* מודאל עריכה */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* כפתור סגירה */}
            <button
              className={styles.closeIcon}
              onClick={() => {
                setShowModal(false); // סגירת המודאל
                setMsg({ type: "", text: "" }); // איפוס הודעות
              }}
            >
              <FaTimes />
            </button>

            {/* כותרת דינמית לפי סוג ההגדרה */}
            <h3 className={styles.modalTitle}>{getSettingTitle(currentKey)}</h3>

            {currentKey === "working_hours" ? (
              <>
                <input
                  type="time"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                />

                <input
                  type="time"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                />
              </>
            ) : currentKey === "participants" ? (
              <>
                <input
                  type="number"
                  value={minValue}
                  placeholder="מינימום משתתפים"
                  onChange={(e) => setMinValue(e.target.value)}
                />

                <input
                  type="number"
                  value={maxValue}
                  placeholder="מקסימום משתתפים"
                  onChange={(e) => setMaxValue(e.target.value)}
                />
              </>
            ) : (
              <input
                type="number"
                value={inputValue}
                placeholder={getPlaceholder(currentKey)}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}

            {/* הודעת מערכת */}
            {msg.text && (
              <div
                className={`${styles.formMsg} ${
                  msg.type === "success" ? styles.successMsg : styles.errorMsg
                }`}
              >
                {msg.text}
              </div>
            )}

            {/* כפתורים */}
            <div className={styles.modalButtons}>
              {/* כפתור שמירה */}
              <button
                className={styles.confirmBtn}
                onClick={saveSetting} // קריאה לפונקציית שמירה
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
