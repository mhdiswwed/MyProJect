/**
 * קומפוננטה:  חלון פופה לבקרה על משימה (למנהל)
 * / TaskManagement נפתח ברגע שלוחץ על כפתור איקון בקרה בעמודת בקרה בקומפוננטה של ניהול משימות
 */

import { useEffect, useState } from "react";
import styles from "./taskControlPanel.module.css";
import API_BASE from "../../config/api";

import { FaXmark } from "react-icons/fa6";
import {
  FaUser,
  FaClock,
  FaCalendarAlt,
  FaFlagCheckered,
  FaPlay,
  FaEye,
} from "react-icons/fa";

export default function TaskControlPanel({ task, onClose }) {
  const [executions, setExecutions] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [bigImage, setBigImage] = useState(null);

  useEffect(() => {
    if (!task) return;

    fetch(`${API_BASE}/api/TaskManagement/${task.task_id}/executions`)
      .then((res) => res.json())
      .then((data) => setExecutions(data))
      .catch(() => setExecutions([]));
  }, [task]);

  if (!task) return null;

  // פורמט זמן (רק שעה ודקה)
  function formatTime(date) {
    if (!date) return "-";

    return new Date(date).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // חישוב הפרש בזמן → שעות ודקות
  function getDiffHM(start, end) {
    if (!start || !end) return "-";

    const diff = new Date(end) - new Date(start);

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours} ש׳ ${minutes} ד׳`;
  }

  // סטטוס התחלה/סיום (גם בשעות ודקות)
  function getStatus(planned, actual) {
    if (!planned || !actual) return "-";

    const diffMs = new Date(actual) - new Date(planned);

    const hours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    const minutes = Math.floor(
      (Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60),
    );

    const text = `${hours} ש׳ ${minutes} ד׳`;

    if (diffMs === 0) return "בזמן";
    if (diffMs > 0) return `איחור ${text}`;
    return `הקדים ${text}`;
  }
  return (
    <div className={styles.overlay}>
      <div
        className={
          task.status === "בוטלה"
            ? `${styles.modal} ${styles.cancelModal}`
            : styles.modal
        }
      >
        <button className={styles.closeIcon} onClick={onClose}>
          <FaXmark />
        </button>
        <h2 className={styles.title}>בקרה על משימה #{task.task_id}</h2>

        {/* ביטול */}
        {task.status === "בוטלה" && (
          <div className={styles.cancelBox}>
            <FaXmark /> {task.cancel_reason || "אין סיבה"}
          </div>
        )}

        {/* טבלה */}
        {task.status === "בוצעה" && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>עובד</th>
                <th>דיווח</th>
                <th>התחלה</th>
                <th>סיום</th>
                <th>סה״כ</th>
              </tr>
            </thead>

            <tbody>
              {executions.map((w, i) => (
                <tr key={i}>
                  {/* עובד */}
                  <td className={styles.workerCell}>
                    <FaUser /> {w.full_name}
                    <div className={styles.role}>{w.role}</div>
                  </td>

                  {/* דיווח */}
                  <td>
                    <FaEye
                      className={styles.icon}
                      onClick={() => setSelectedReport(w)}
                    />
                  </td>

                  {/* התחלה (הכל בתא אחד) */}
                  <td className={styles.cellBlock}>
                    <span>
                      <FaPlay /> מתוכנן: {formatTime(task.start_time)}
                    </span>
                    <br />
                    <span>
                      <FaClock /> בפועל: {formatTime(w.start_time)}
                    </span>
                    <br />
                    <span className={styles.result}>
                      {getStatus(task.start_time, w.start_time)}
                    </span>
                  </td>

                  {/* סיום */}
                  <td className={styles.cellBlock}>
                    <span>
                      <FaFlagCheckered /> מתוכנן: {formatTime(task.due_time)}
                    </span>
                    <br />
                    <span>
                      <FaClock /> בפועל: {formatTime(w.end_time)}
                    </span>
                    <br />
                    <span className={styles.result}>
                      {getStatus(task.due_time, w.end_time)}
                    </span>
                  </td>

                  {/* סה״כ */}
                  <td className={styles.total}>
                    <FaClock /> {getDiffHM(w.start_time, w.end_time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* מודאל דיווח */}
        {selectedReport && (
          <div className={styles.innerModal}>
            <div className={styles.innerContent}>
              <h3>דיווח עובד</h3>

              {selectedReport.note && (
                <div className={styles.noteBox}>
                  <div className={styles.noteTitle}> תיעוד:</div>

                  <div className={styles.noteText}>{selectedReport.note}</div>
                </div>
              )}

              {selectedReport.image && (
                <img
                  src={`${API_BASE}${selectedReport.image}`}
                  className={styles.image}
                  onClick={() =>
                    setBigImage(`${API_BASE}${selectedReport.image}`)
                  }
                  alt=""
                />
              )}

              <div className={styles.btnRow}>
                <button
                  className={styles.closeInnerBtn}
                  onClick={() => setSelectedReport(null)}
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        )}

        {/* הגדלת תמונה */}
        {bigImage && (
          <div className={styles.imageModal} onClick={() => setBigImage(null)}>
            <img src={bigImage} className={styles.bigImage} />
          </div>
        )}
      </div>
    </div>
  );
}
