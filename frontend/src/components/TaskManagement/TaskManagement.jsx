/**
 * קומפוננטה: ניהול משימות (צד המנהל)
 */

import { useEffect, useState } from "react";
import styles from "./taskManagement.module.css";
import CreateTaskModal from "../CreateTaskModal/CreateTaskModal";
import API_BASE from "../../config/api";
// קומפוננטה להצגת פרטי משימה במודאל (צד מנהל)
import TaskDetailsModalAdmin from "../TaskDetailsModalAdmin/TaskDetailsModalAdmin";
// קומפוננטת בקרה על ביצוע משימה
import TaskControlPanel from "../TaskControlPanel/TaskControlPanel";

// אייקונים
import {
  FaEye,
  FaPlus,
  FaFlagCheckered,
  FaCalendarAlt,
  FaClock,
  FaPlay,
  FaChartBar,
} from "react-icons/fa";

export default function TaskManagement() {
  //===========================
  // STATE
  //===========================

  // רשימת משימות מהשרת
  const [tasks, setTasks] = useState([]);

  // פילטרים
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // מודאל ביטול
  const [showCancelModal, setShowCancelModal] = useState(false);

  // משימה שנבחרה לביטול
  const [selectedTask, setSelectedTask] = useState(null);

  // סיבת ביטול
  const [cancelReason, setCancelReason] = useState("");

  // שגיאה
  const [error, setError] = useState("");

  const [msg, setMsg] = useState({ type: "", text: "" });
  // מודאל יצירת משימה
  const [showCreateModal, setShowCreateModal] = useState(false);
  // האם להציג מודאל פרטי משימה
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // מודאל בקרה
  const [showControlModal, setShowControlModal] = useState(false);

  //===========================
  // שליפת משימות מהשרת
  //===========================
  function fetchTasks() {
    fetch(`${API_BASE}/api/TaskManagement`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTasks(data);
        else setTasks([]);
      })
      .catch(() => setTasks([]));
  }

  // טעינה ראשונית
  useEffect(() => {
    fetchTasks();
  }, []);

  //===========================
  // סינון
  //===========================
  const filteredTasks = tasks.filter((t) => {
    const statusMatch = statusFilter === "all" || t.status === statusFilter;

    const typeMatch = typeFilter === "all" || t.task_type === typeFilter;

    return statusMatch && typeMatch;
  });

  //===========================
  // סטטיסטיקות
  //===========================
  const stats = {
    total: tasks.length,
    open: tasks.filter((t) => t.status === "פתוחה").length,
    progress: tasks.filter((t) => t.status === "בטיפול").length,
    done: tasks.filter((t) => t.status === "בוצעה").length,
    cancel: tasks.filter((t) => t.status === "בוטלה").length,
  };

  //===========================
  // צבעים לסטטוס
  //===========================
  function getStatusClass(status) {
    if (status === "פתוחה") return styles.open;
    if (status === "בטיפול") return styles.inProgress;
    if (status === "בוצעה") return styles.done;
    if (status === "בוטלה") return styles.cancelled;
    return "";
  }

  /**===================
   * פתיחת מודאל ביטול
  ===================== */
  function openCancelModal(task) {
    setSelectedTask(task);
    setCancelReason("");
    setError("");
    setShowCancelModal(true);
  }

  /**=================
   * אישור ביטול
   ====================*/
  async function handleCancel() {
    if (!cancelReason.trim()) {
      setMsg({ type: "error", text: "חובה לכתוב סיבה לביטול" });
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/TaskManagement/cancel/${selectedTask.task_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: cancelReason,
          }),
        },
      );

      if (!res.ok) {
        setMsg({ type: "error", text: "שגיאה בביטול" });
        return;
      }

      setMsg({ type: "success", text: "המשימה בוטלה" });

      setTimeout(() => {
        setShowCancelModal(false);
        fetchTasks();
      }, 2200);
    } catch {
      setMsg({ type: "error", text: "שגיאה בביטול" });
    }
  }

  //מחיקת הודעות שגיה אם לחצתי כפתור ביטול במודל ביטול
  function closeCancelModal() {
    setShowCancelModal(false);
    setCancelReason("");
    setMsg({ type: "", text: "" });
  }

  // פותח מודאל של פרטי משימה ושומר את המשימה שנבחרה
  function openDetailsModal(task) {
    setSelectedTask(task); // שומר את המשימה שנלחצה
    setShowDetailsModal(true); // פותח את המודאל
  }

  /**
   * פתיחת מודאל בקרה על משימה
   */
  function openControlModal(task) {
    setSelectedTask(task); // שומר את המשימה
    setShowControlModal(true); // פותח מודאל
  }
  return (
    <div className={styles.page} dir="rtl">
      <h1 className={styles.title}>ניהול משימות</h1>

      {/* סטטיסטיקות */}
      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <div className={styles.statNumber}>{stats.total}</div>
          <div className={styles.statLabel}>סה״כ</div>
        </div>

        <div className={`${styles.statBox} ${styles.openBox}`}>
          <div className={styles.statNumber}>{stats.open}</div>
          <div className={styles.statLabel}>פתוחה</div>
        </div>

        <div className={`${styles.statBox} ${styles.progressBox}`}>
          <div className={styles.statNumber}>{stats.progress}</div>
          <div className={styles.statLabel}>בטיפול</div>
        </div>

        <div className={`${styles.statBox} ${styles.doneBox}`}>
          <div className={styles.statNumber}>{stats.done}</div>
          <div className={styles.statLabel}>בוצעה</div>
        </div>

        <div className={`${styles.statBox} ${styles.cancelBox}`}>
          <div className={styles.statNumber}>{stats.cancel}</div>
          <div className={styles.statLabel}>בוטלה</div>
        </div>
      </div>

      {/* פילטרים + כפתור */}
      <div className={styles.actionsRow}>
        <div className={styles.filters}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="פתוחה">פתוחה</option>
            <option value="בטיפול">בטיפול</option>
            <option value="בוצעה">בוצעה</option>
            <option value="בוטלה">בוטלה</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">כל הסוגים</option>
            <option value="סכנה">סכנה</option>
            <option value="חסימה">חסימה</option>
            <option value="תחזוקה">תחזוקה</option>
            <option value="ניקיון">ניקיון</option>
          </select>
        </div>

        <button
          className={styles.addBtn}
          onClick={() => setShowCreateModal(true)}
        >
          <FaPlus /> הוספת משימה
        </button>
      </div>

      {/* טבלה */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>מספר</th>
            <th>סוג</th>
            <th>מקור</th>
            <th>טיול</th>
            <th>זמנים (שעת התחלה וסיום מתוכננים)</th>
            <th>סטטוס</th>
            <th>פרטים</th>
            <th>בקרה</th>
            <th>פעולות</th>
          </tr>
        </thead>

        <tbody>
          {filteredTasks.length === 0 ? (
            <tr>
              <td colSpan="9" className={styles.emptyRow}>
                אין משימות
              </td>
            </tr>
          ) : (
            filteredTasks.map((t) => (
              <tr key={t.task_id}>
                <td>{t.task_id}</td>
                <td>{t.task_type}</td>
                <td>
                  {t.report_id ? (
                    <span className={styles.reportBadge}>📍 דיווח</span>
                  ) : (
                    <span className={styles.manualBadge}>🛠 ידני</span>
                  )}
                </td>
                <td>{t.trail_name || "-"}</td>

                <td>
                  {/* התחלה */}
                  <div>
                    <FaPlay className={styles.FaPlay} /> <FaCalendarAlt />{" "}
                    {t.start_time
                      ? new Date(t.start_time).toLocaleDateString("he-IL")
                      : "-"}
                    {" | "}
                    <FaClock />{" "}
                    {t.start_time
                      ? new Date(t.start_time).toTimeString().slice(0, 5)
                      : "-"}
                  </div>

                  {/* סיום */}
                  <div>
                    <FaFlagCheckered className={styles.FaFlagCheckered} />{" "}
                    <FaCalendarAlt />{" "}
                    {t.due_time
                      ? new Date(t.due_time).toLocaleDateString("he-IL")
                      : "-"}
                    {" | "}
                    <FaClock />{" "}
                    {t.due_time
                      ? new Date(t.due_time).toTimeString().slice(0, 5)
                      : "-"}
                  </div>
                </td>

                {/* סטטוס*/}
                <td>
                  <span
                    className={`${styles.status} ${getStatusClass(t.status)}`}
                  >
                    {t.status}
                  </span>
                </td>

                {/* פרטים */}
                <td>
                  {/* כפתור צפייה בפרטי משימה */}
                  <FaEye
                    className={styles.iconBtn}
                    onClick={() => openDetailsModal(t)} // פתיחת מודאל עם המשימה
                  />
                </td>

                {/* בקרה */}
                <td>
                  {(t.status === "בוצעה" || t.status === "בוטלה") && (
                    <FaChartBar
                      className={styles.iconBtn}
                      onClick={() => openControlModal(t)} // פתיחת בקרה
                    />
                  )}
                </td>

                {/* פעולות*/}
                <td>
                  {t.status === "פתוחה" && (
                    <button
                      className={styles.cancelBtn}
                      onClick={() => openCancelModal(t)}
                    >
                      בטל
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* מודאל ביטול משימה */}
      {showCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>ביטול משימה</h2>

            <textarea
              placeholder="כתוב סיבה לביטול"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />

            {/* הודעה  */}
            {msg.text && (
              <div
                className={`${styles.formMsg} ${
                  msg.type === "success" ? styles.successMsg : styles.errorMsg
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className={styles.btnRow}>
              <button onClick={handleCancel} className={styles.saveBtn}>
                אישור ביטול
              </button>

              <button onClick={closeCancelModal} className={styles.closeBtn}>
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל יצירת משימה */}
      {showCreateModal && (
        <CreateTaskModal
          mode="manual" //  חשוב! זה מנהל
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchTasks} // רענון אחרי יצירה
        />
      )}

      {/* מודאל פרטי משימה */}
      {showDetailsModal && selectedTask && (
        <TaskDetailsModalAdmin
          task={selectedTask} // מעביר את המשימה שנבחרה
          onClose={() => setShowDetailsModal(false)} // סגירה
        />
      )}

      {/* מודאל בקרה על ביצוע */}
      {showControlModal && selectedTask && (
        <TaskControlPanel
          task={selectedTask} // מעביר את המשימה
          onClose={() => setShowControlModal(false)} // סגירה
        />
      )}
    </div>
  );
}
