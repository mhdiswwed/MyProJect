/**
 * קומפוננטה: המשימות שלי (עובד)
 */

import { useEffect, useState } from "react";
import styles from "./myTasks.module.css";
import API_BASE from "../../config/api";

import {
  FaEye,
  FaPlay,
  FaFlagCheckered,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";

export default function MyTasks({ user }) {
  // רשימת משימות
  const [tasks, setTasks] = useState([]);

  // פילטר
  const [filter, setFilter] = useState("all");

  // זמן לטיימר
  const [now, setNow] = useState(Date.now());

  /**
   * עדכון טיימר כל שנייה
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * שליפת משימות מהשרת
   */
  useEffect(() => {
    if (!user) return;

    fetch(`${API_BASE}/api/MyTasks/${user.user_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTasks(data);
        } else {
          setTasks([]); // הגנה מקריסה
        }
      })
      .catch(() => setTasks([]));
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
  async function startTask(id) {
    await fetch(`${API_BASE}/api/MyTasks/start/${id}`, {
      method: "PUT",
    });

    setTasks((prev) =>
      prev.map((t) =>
        t.task_id === id
          ? {
              ...t,
              status: "בטיפול",
              start_time: new Date().toISOString(),
            }
          : t,
      ),
    );
  }

  /**
   * סיום משימה (כרגע רק פתיחה עתידית)
   */
  function endTask(task) {
    console.log("TODO: open modal", task);
  }

  function getStatusClass(status) {
    if (status === "פתוחה") return styles.open;
    if (status === "בטיפול") return styles.inProgress;
    if (status === "בוצעה") return styles.done;
    if (status === "בוטלה") return styles.cancelled;
    return "";
  }
  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.topBar}>
        <div className={styles.topBarRow}>
          {/* כותרת */}
          <h1 className={styles.title}>המשימות שלי</h1>

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
      <table className={styles.table}>
        <thead>
          <tr>
            <th>משימה</th>
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
              <tr key={t.task_id}>
                <td>{t.task_id}</td>
                <td>{t.task_type}</td>
                <td>{t.role}</td>
                <td>{t.trail_name}</td>

                {/* 🔥 עמודת זמנים */}
                <td>
                  <div>
                    <FaPlay title="התחלה" className={styles.FaPlay} /> <FaCalendarAlt />{" "}
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
                    <FaFlagCheckered title="סיום" className={styles.FaFlagCheckered} />{" "}
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
                  <FaEye className={styles.iconBtn} />
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
                      <br/>
                      ⏱ {getTimer(t.start_time)}
                    </div>
                  )}
                </td>

                {/* פעולות */}
                <td>
                  {t.status === "פתוחה" && (
                    <button
                      className={styles.approveBtn}
                      onClick={() => startTask(t.task_id)}
                    >
                      <FaPlay className={styles.btnIcon}/> התחלה
                    </button>
                  )}

                  {t.status === "בטיפול" && (
                    <button
                      className={styles.cancelBtn}
                      onClick={() => endTask(t)}
                    >
                      <FaFlagCheckered className={styles.btnIcon}/> סיום
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
