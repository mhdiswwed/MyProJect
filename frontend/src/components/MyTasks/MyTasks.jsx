/**
 MyTasks
המשימות של העובד – הצגת משימות, סינון לפי סטטוס, התחלה וסיום משימה, טיימר בזמן אמת, שליחת דיווח והצגת סיבת ביטול
 */

import { useEffect, useState } from "react";
import styles from "./myTasks.module.css";
import API_BASE from "../../config/api";
// ייבוא מודאל פרטי משימה
import TaskDetailsModal from "../TaskDetailsModal/TaskDetailsModal";
// ייבוא מודאל דיווח
import ReportModal from "../ReportModal/ReportModal";

import {
  FaEye,
  FaPlay,
  FaFlagCheckered,
  FaCalendarAlt,
  FaClock,
  FaCamera,
  FaBell,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaClipboardList,
} from "react-icons/fa";


import { MdAccessTime, MdAttachMoney } from "react-icons/md";

export default function MyTasks({ user }) {
  // רשימת משימות
  const [tasks, setTasks] = useState([]);

  // פילטר
  const [filter, setFilter] = useState("all");

  // זמן לטיימר
  const [now, setNow] = useState(Date.now());

  // משימה שנבחרה (לפתיחת הפופאפ)
  const [selectedTask, setSelectedTask] = useState(null);

  // סטייט לפתיחת מודאל דיווח משימה
  const [showTaskReport, setShowTaskReport] = useState(false);

  // סטייט למשימה שנבחרה
  const [selectedTaskReport, setSelectedTaskReport] = useState(null);

  // מודאל סיבת ביטול
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);

  // משימה להצגת סיבה
  const [selectedCancelTask, setSelectedCancelTask] = useState(null);

  /**
   * עדכון טיימר כל שנייה
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  //===============================
  // פונקציה לרענון משימות מהשרת
  //===============================
  function fetchTasks() {
    fetch(`${API_BASE}/api/MyTasks/${user.user_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTasks(data);
        else setTasks([]);
      })
      .catch(() => setTasks([]));
  }

  /**====================
   * שליפת משימות מהשרת
   ==================*/
  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user]);

  /**
   * חישוב טיימר
   */
  function getTimer(startTime) {
    if (!startTime) return "-";

    const diff = now - new Date(startTime);

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  /**
   * סינון
   */
  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  /**
   * סטטיסטיקות
   */
  const stats = tasks.reduce(
    (acc, t) => {
      acc.total++;

      if (t.status === "פתוחה") acc.open++;
      else if (t.status === "בטיפול") acc.inProgress++;
      else if (t.status === "בוצעה") acc.done++;
      else if (t.status === "בוטלה") acc.cancelled++;

      return acc;
    },
    {
      total: 0,
      open: 0,
      inProgress: 0,
      done: 0,
      cancelled: 0,
    },
  );

  /**
   * התחלת משימה
   */

  async function startTask(task) {
    await fetch(`${API_BASE}/api/MyTasks/start/${task.task_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.user_id,
      }),
    });

    setTasks((prev) =>
      prev.map((t) =>
        t.task_id === task.task_id
          ? {
              ...t,
              status: "בטיפול",
              start_time: new Date().toISOString(),
            }
          : t,
      ),
    );

    fetchTasks(); // רענון
  }

  function getStatusClass(status) {
    if (status === "פתוחה") return styles.open;
    if (status === "בטיפול") return styles.inProgress;
    if (status === "בוצעה") return styles.done;
    if (status === "בוטלה") return styles.cancelled;
    return "";
  }
  //===================================
  // סיום משימה + פתיחת מודאל דיווח
  //==================================
  async function endTask(task) {
    try {
      await fetch(`${API_BASE}/api/MyTasks/end/${task.task_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json", // שולח JSON
        },
        body: JSON.stringify({
          user_id: user.user_id, // שולח את המשתמש
        }),
      });

      setSelectedTaskReport(task); // שומר משימה לדיווח
      setShowTaskReport(true); // פותח מודאל
    } catch {
      console.log("שגיאה");
    }
  }

  //===============================================================================================
  // טיפול בהטדעות תזכורת למשימות מחר ומחרתיים
  //===============================================================================================
  //==============================
  // טקסט: מחר / מחרתיים
  //==============================
  function getTaskLabel(date) {
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diff = Math.round((taskDate - today) / (1000 * 60 * 60 * 24));

    if (diff === 1) return "מחר";
    if (diff === 2) return "מחרתיים";

    return "";
  }

  //==============================
  // highlight שורה
  //==============================
  const [highlightedId, setHighlightedId] = useState(null);

  function handleTaskClick(task) {
    setHighlightedId(task.task_id);

    const row = document.getElementById(`task-${task.task_id}`);

    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setTimeout(() => {
      setHighlightedId(null);
    }, 6000);
  }
  //===============================
  // מחזיר טקסט לפי סוג משימה
  //=================================
  function getTaskTypeText(task) {
    if (task.task_type === "ניקיון") {
      return `ניקיון ב${task.trail_name}`;
    }

    if (task.task_type === "תחזוקה") {
      return `תחזוקה ב${task.trail_name}`;
    }

    if (task.task_type === "סכנה") {
      return `טיפול בסכנה ב${task.trail_name}`;
    }

    // ברירת מחדל
    return `${task.task_type} ב${task.trail_name}`;
  }

  //=========================================
  // מחשב משך זמן מדויק (שעות + דקות)
  //=========================================
  function getDuration(task) {
    //  אם אין התחלה או סיום
    if (!task.start_time || !task.end_time) return "משך לא ידוע";
    const start = new Date(task.start_time);
    const end = new Date(task.end_time);
    // הפרש במילישניות
    const diff = end - start;
    // חישוב שעות
    const hours = Math.floor(diff / (1000 * 60 * 60));
    // חישוב דקות
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    // אם אין דקות
    if (minutes === 0) {
      return `${hours} שעות`;
    }
    // אם אין שעות
    if (hours === 0) {
      return `${minutes} דקות`;
    }
    // רגיל
    return `${hours} שעות ו-${minutes} דקות`;
  }

  //=====================================================
  // סינון משימות קרובות (מחר או מחרתיים) לפי תאריך בלבד
  //=====================================================
  const upcomingTasks = tasks.filter((t) => {
    // לא מציג בוטלה / בוצעה
    if (t.status === "בוטלה" || t.status === "בוצעה") return false;
    if (!t.start_time) return false;
    // תאריך המשימה (מאפסים שעה)
    const taskDate = new Date(t.start_time);
    taskDate.setHours(0, 0, 0, 0);
    // תאריך היום (מאפסים שעה)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // חישוב הפרש ימים מדויק
    const diff = Math.round((taskDate - today) / (1000 * 60 * 60 * 24));
    return diff === 1 || diff === 2;
  });
  //=================================================================================================
  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.topBar}>
        <div className={styles.topBarRow}>
          {/* כותרת */}
          <h1 className={styles.title}>המשימות שלי</h1>

          {/* תזכורת למחר או מחרתיים*/}
          {upcomingTasks.length > 0 && (
            <div className={styles.alertBox}>
              <div className={styles.alertTitle}>
                <FaBell /> יש לך {upcomingTasks.length} משימות קרובות
              </div>

              {upcomingTasks.slice(0, 3).map((task) => (
                <div
                  key={task.task_id}
                  className={styles.alertItem}
                  onClick={() => handleTaskClick(task)}
                >
                  <FaMapMarkerAlt />
                  {getTaskLabel(task.start_time)} – {getTaskTypeText(task)}{" "}
                  מתחילים בשעה <MdAccessTime />{" "}
                  {new Date(task.start_time).toTimeString().slice(0, 5)} למשך{" "}
                  {getDuration(task)}
                </div>
              ))}
            </div>
          )}

          {/* סטטיסטיקות */}
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statLabel}>סה״כ</div>
            </div>

            <div className={`${styles.statBox} ${styles.plannedBox}`}>
              <div className={styles.statNumber}>{stats.open}</div>
              <div className={styles.statLabel}>פתוחה</div>
            </div>

            <div className={`${styles.statBox} ${styles.inProgressBox}`}>
              <div className={styles.statNumber}>{stats.inProgress}</div>
              <div className={styles.statLabel}>בטיפול</div>
            </div>

            <div className={`${styles.statBox} ${styles.finishedBox}`}>
              <div className={styles.statNumber}>{stats.done}</div>
              <div className={styles.statLabel}>בוצעה</div>
            </div>

            <div className={`${styles.statBox} ${styles.cancelledBox}`}>
              <div className={styles.statNumber}>{stats.cancelled}</div>
              <div className={styles.statLabel}>בוטלה</div>
            </div>

            {/* פילטר */}
            <div className={styles.filterBox}>
              <label className={styles.filterLabel}>סינון:</label>

              <select
                className={styles.filterSelect}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">הכל</option>
                <option value="פתוחה">פתוחה</option>
                <option value="בטיפול">בטיפול</option>
                <option value="בוצעה">בוצעה</option>
                <option value="בוטלה">בוטלה</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      {/* טבלה */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>משימה</th>
              <th>מקור</th>
              <th>סוג</th>
              <th>תפקיד שלי</th>
              <th>טיול</th>
              <th>זמנים (שעת התחלה וסיום מתוכננים)</th>
              <th>פרטים</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.emptyRow}>
                  אין משימות
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr
                  key={t.task_id}
                  id={`task-${t.task_id}`}
                  className={`
                  ${(() => {
                    if (!t.start_time) return "";

                    const taskDate = new Date(t.start_time);
                    const today = new Date();

                    taskDate.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);

                    const diffDays = (taskDate - today) / (1000 * 60 * 60 * 24);

                    const isUrgent = diffDays >= 0 && diffDays <= 2;
                    const isActive =
                      t.status === "פתוחה" || t.status === "בטיפול";

                    return isUrgent && isActive ? styles.urgentRow : "";
                  })()}

                  ${highlightedId === t.task_id ? styles.highlightRow : ""}
                `}
                >
                  <td>{t.task_id}</td>
                  <td>
                    <p>
                      {t.report_id ? (
                        <span className={styles.reportBadge}>
                          <FaMapMarkerAlt /> מבוסס על דיווח מהשטח
                        </span>
                      ) : (
                        <span className={styles.manualBadge}>
                          <FaClipboardList /> משימה מתוזמנת
                        </span>
                      )}
                    </p>
                  </td>
                  <td>{t.task_type}</td>
                  <td>{t.role}</td>
                  <td>{t.trail_name}</td>

                  {/* 🔥 עמודת זמנים */}
                  <td>
                    <div>
                      <FaPlay title="התחלה" className={styles.FaPlay} />{" "}
                      <FaCalendarAlt />{" "}
                      {t.start_time
                        ? new Date(t.start_time).toLocaleDateString("he-IL")
                        : "-"}
                      {" | "}
                      <FaClock />{" "}
                      {t.start_time
                        ? new Date(t.start_time).toTimeString().slice(0, 5)
                        : "-"}
                    </div>

                    <div>
                      <FaFlagCheckered
                        title="סיום"
                        className={styles.FaFlagCheckered}
                      />{" "}
                      <FaCalendarAlt />{" "}
                      {t.end_time
                        ? new Date(t.end_time).toLocaleDateString("he-IL")
                        : "-"}
                      {" | "}
                      <FaClock />{" "}
                      {t.end_time
                        ? new Date(t.end_time).toTimeString().slice(0, 5)
                        : "-"}
                    </div>
                  </td>

                  {/* פרטים */}
                  <td>
                    {/*לחיצה על העין פותחת את המודאל עם המשימה*/}
                    <FaEye
                      className={styles.iconBtn}
                      onClick={() => setSelectedTask(t)}
                    />
                  </td>

                  {/* סטטוס */}
                  <td>
                    <span
                      className={`${styles.status} ${getStatusClass(t.status)}`}
                    >
                      {t.status}
                    </span>

                    {t.status === "בטיפול" && (
                      <div className={styles.timer}>
                        <br />⏱ {getTimer(t.execution_start_time)}
                      </div>
                    )}
                  </td>

                  {/* פעולות */}
                  <td>
                    {/* התחלה */}
                    {t.status === "פתוחה" && (
                      <button
                        className={styles.approveBtn}
                        onClick={() => startTask(t)}
                      >
                        <FaPlay className={styles.btnIcon} /> התחלה
                      </button>
                    )}

                    {/* סיום */}
                    {t.status === "בטיפול" && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => endTask(t)}
                      >
                        <FaFlagCheckered className={styles.btnIcon} /> סיום
                      </button>
                    )}

                    {/* אם כבר בוצעה ואין דיווח */}
                    {t.status === "בוצעה" &&
                      !t.execution_note &&
                      !t.execution_image && (
                        <button
                          onClick={() => endTask(t)}
                          className={styles.reportBtn}
                        >
                          <FaCamera className={styles.btnIcon} />
                          שלח דיווח
                        </button>
                      )}

                    {/* אם בוטלה → כפתור סיבה */}
                    {t.status === "בוטלה" && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => {
                          setSelectedCancelTask(t);
                          setShowCancelReasonModal(true);
                        }}
                      >
                        <FaInfoCircle className={styles.btnIconFaInfoCircle} />{" "}
                        סיבה
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* ========================= מודאל פרטי משימה ========================= */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask} // שולח את המשימה הנבחרת
          onClose={() => setSelectedTask(null)} // סגירה
        />
      )}

      {/* מודאל דיווח משימה*/}
      {showTaskReport && selectedTaskReport && (
        <ReportModal
          task={selectedTaskReport} // המשימה
          user={user} // המשתמש
          onClose={() => setShowTaskReport(false)} // סגירה
          onSuccess={fetchTasks} // רענון
        />
      )}

      {/* מודאל סיבת ביטול */}
      {showCancelReasonModal && selectedCancelTask && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>סיבת ביטול</h2>

            <p style={{ marginTop: "10px" }}>
              {selectedCancelTask.cancel_reason || "לא צוינה סיבה"}
            </p>

            <div className={styles.btnRow}>
              <button
                className={styles.closeBtn}
                onClick={() => setShowCancelReasonModal(false)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
