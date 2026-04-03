//===================================
// קומפוננטה לניהול דיווחים מהשטח על ידי מנהל
//====================================

import { useEffect, useState } from "react";
import styles from "./fieldReports.module.css";
import ReportDetailsModal from "../ReportDetailsModal/ReportDetailsModal";
// ייבוא קומפוננטת יצירת משימה
import CreateTaskModal from "../CreateTaskModal/CreateTaskModal";
// =========================
// אייקונים
// =========================
import {
  FaEye,
  FaCheck,
  FaFileExport,
  FaPhone,
  FaWhatsapp,
  FaEnvelope,
} from "react-icons/fa";

import API_BASE from "../../config/api";

export default function FieldReports() {
  // =========================
  // state - רשימת הדיווחים מהשרת
  // =========================
  const [reports, setReports] = useState([]);

  // =========================
  // state - פילטר לפי סטטוס
  // =========================
  const [filter, setFilter] = useState("all");

  // =========================
  // state - מודאל פרטי משתמש
  // =========================
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // =========================
  // state - הודעת מערכת (הצלחה / שגיאה)
  // =========================
  const [msg, setMsg] = useState({ type: "", text: "" });

  // =========================
  // מודאל אישור טופל
  // =========================
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // =========================
  // דיווח נבחר לצפייה
  // =========================
  const [selectedReportView, setSelectedReportView] = useState(null);

  // state שמחליט אם להציג את הפופאפ
  const [showTaskModal, setShowTaskModal] = useState(false);

  // state ששומר איזה דיווח נבחר ליצירת משימה
  const [selectedReportForTask, setSelectedReportForTask] = useState(null);

  // =========================
  // טעינת דיווחים מהשרת
  // =========================
  useEffect(() => {
    loadReports();
  }, []);

  // =========================
  // פונקציה לשליפת דיווחים מהשרת
  // =========================
  async function loadReports() {
    try {
      const res = await fetch(`${API_BASE}/api/FieldReports`);
      const data = await res.json();

      // שומר את הדיווחים ב-state
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      // הודעת שגיאה למשתמש
      setMsg({ type: "error", text: "שגיאה בטעינת דיווחים" });
    }
  }

  // =========================
  // חישוב סטטיסטיקות
  // =========================
  const stats = reports.reduce(
    (acc, r) => {
      acc.total++;

      if (r.status === "חדש") acc.new++;
      else if (r.status === "בטיפול") acc.inProgress++;
      else if (r.status === "טופל") acc.done++;

      return acc;
    },
    { total: 0, new: 0, inProgress: 0, done: 0 },
  );

  // =========================
  // סינון לפי סטטוס
  // =========================
  const filteredReports = reports.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  // =========================
  // פתיחת מודאל פרטי מדווח
  // =========================
  function openUser(user) {
    setSelectedUser(user);
    setShowUserModal(true);
  }

  // =========================
  // המרת מספר לוואטסאפ
  // =========================
  function formatPhone(phone) {
    if (!phone) return "";

    let clean = phone.replace(/\D/g, "");

    if (clean.startsWith("0")) {
      return "972" + clean.substring(1);
    }

    return clean;
  }

  // =========================
  // שינוי סטטוס ל"טופל"
  // =========================
  async function markAsDone(id) {
    try {
      const res = await fetch(`${API_BASE}/api/FieldReports/done/${id}`, {
        method: "PUT",
      });

      const data = await res.json();

      setMsg({
        type: res.ok ? "success" : "error",
        text: data.message,
      });

      // רענון טבלה
      loadReports();
    } catch {
      setMsg({ type: "error", text: "שגיאה בעדכון סטטוס" });
    }
  }

  // =========================
  // מעבר ל"בטיפול"
  // =========================
  async function markInProgress(id) {
    try {
      const res = await fetch(`${API_BASE}/api/FieldReports/inProgress/${id}`, {
        method: "PUT",
      });

      const data = await res.json();

      setMsg({
        type: res.ok ? "success" : "error",
        text: data.message,
      });

      loadReports();
    } catch {
      setMsg({ type: "error", text: "שגיאה בעדכון סטטוס" });
    }
  }

  // פתיחת חלון אישור טופל
  function openDoneModal(report) {
    setSelectedReport(report);
    setShowDoneModal(true);
  }

  // פונקציה שפותחת את הפופאפ ומכניסה את הדיווח שנבחר
  function openTaskModal(report) {
    setSelectedReportForTask(report); // שומר את הדיווח שנבחר
    setShowTaskModal(true); // פותח את המודאל
  }
  
  return (
    <div className={styles.page} dir="rtl">
      {/* =========================
         כותרת
      ========================= */}
      <h1 className={styles.title}>דיווחים מהשטח</h1>
      {/* =========================
         סטטיסטיקות + פילטר
      ========================= */}
      <div className={styles.statsRow}>
        {/* סה"כ */}
        <div className={styles.statBox}>
          <div className={styles.statNumber}>{stats.total}</div>
          <div className={styles.statLabel}>סה"כ</div>
        </div>

        {/* חדש */}
        <div className={`${styles.statBox} ${styles.plannedBox}`}>
          <div className={styles.statNumber}>{stats.new}</div>
          <div className={styles.statLabel}>חדש</div>
        </div>

        {/* בטיפול */}
        <div className={`${styles.statBox} ${styles.inProgressBox}`}>
          <div className={styles.statNumber}>{stats.inProgress}</div>
          <div className={styles.statLabel}>בטיפול</div>
        </div>

        {/* טופל */}
        <div className={`${styles.statBox} ${styles.finishedBox}`}>
          <div className={styles.statNumber}>{stats.done}</div>
          <div className={styles.statLabel}>טופל</div>
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
            <option value="חדש">חדש</option>
            <option value="בטיפול">בטיפול</option>
            <option value="טופל">טופל</option>
          </select>
        </div>
      </div>
      {/* =========================
         טבלה
      ========================= */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>מס׳</th>
              <th>סוג בעיה</th>
              <th>שם מדווח</th>
              <th>טיול</th>
              <th>תאריך ושעה</th>
              <th>פרטים</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>

          <tbody>
            {filteredReports.map((r) => (
              <tr key={r.report_id}>
                <td>{r.report_id}</td>

                <td>{r.problem_type}</td>

                {/* שם מדווח לחיץ */}
                <td>
                  <span
                    style={{ cursor: "pointer", color: "#38bdf8" }}
                    onClick={() => openUser(r)}
                  >
                    {r.reporter_name}
                  </span>
                </td>

                <td>{r.trail_name}</td>

                {/* תאריך + שעה */}
                <td>
                  <div>
                    {new Date(r.report_time).toLocaleDateString("he-IL")}
                  </div>
                  <div className={styles.timeRow}>
                    {new Date(r.report_time).toTimeString().slice(0, 5)}
                  </div>
                </td>

                {/* כפתור עין */}

                <td>
                  <FaEye
                    className={styles.actionBtn}
                    title="צפייה בפירוט הדיווח" // טולטיפ כשעוברים עם העכבר
                    onClick={() => setSelectedReportView(r)} //
                  />
                </td>

                {/* סטטוס*/}
                <td>{r.status}</td>

                {/* פעולות */}
                <td>
                  <div className={styles.actionsRow}>
                    {/* =========================
                       יצור משימה - רק לחדש
                    ========================= */}
                    {r.status === "חדש" && (
                      <button
                        className={styles.editBtn}
                        onClick={() => openTaskModal(r)} // בלחיצה פותח פופאפ עם הדיווח
                      >
                        <FaFileExport /> יצור משימה
                      </button>
                    )}

                    {/* =========================
                       טופל
                     ========================= */}
                    {r.status !== "טופל" && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => openDoneModal(r)}
                      >
                        <FaCheck /> טופל
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* =========================
         מודאל פרטי מדווח
      ========================= */}
      {showUserModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>פרטי מדווח</h2>

            <p>
              <strong>שם:</strong> {selectedUser?.reporter_name}
            </p>

            <p>
              <strong>טלפון:</strong>{" "}
              <a href={`tel:${selectedUser.phone}`}>
                <FaPhone className={styles.phoneIcon} />
              </a>
              {selectedUser.phone}
              <a
                href={`https://wa.me/${formatPhone(selectedUser.phone)}`}
                target="_blank"
                rel="noreferrer"
              >
                <FaWhatsapp className={styles.whatsappIcon} />
              </a>
            </p>

            <p>
              <strong>אימייל:</strong>{" "}
              <a href={`mailto:${selectedUser.email}`}>
                <FaEnvelope className={styles.emailIcon} />
              </a>
              {selectedUser.email}
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.closeBtn}
                onClick={() => setShowUserModal(false)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
      {/* =========================
       מודאל אישור טופל
        ========================= */}
      {showDoneModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>אישור פעולה</h2>

            <p>האם אתה בטוח שהדיווח טופל?</p>

            {/* הודעת מערכת */}
            {msg.text && (
              <div
                className={`${styles.inlineMsg} ${
                  msg.type === "success"
                    ? styles.inlineSuccess
                    : styles.inlineError
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className={styles.modalActions}>
              {/* אישור */}
              <button
                className={styles.saveBtn}
                onClick={async () => {
                  await markAsDone(selectedReport.report_id);

                  setTimeout(() => {
                    setShowDoneModal(false);
                    setSelectedReport(null);
                    setMsg({ type: "", text: "" });
                  }, 1500);
                }}
              >
                כן, טופל
              </button>

              {/* ביטול */}
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowDoneModal(false);
                  setSelectedReport(null);
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
      {/*// ========================= 
      // פופאפ פרטי דיווח //
      =========================*/}
      {selectedReportView && (
        <ReportDetailsModal
          report={selectedReportView}
          onClose={() => setSelectedReportView(null)} // סגירה
        />
      )}
      {/*// ========================= // 
     // מודאל יצירת משימה //
      =========================*/}
      {showTaskModal && selectedReportForTask && (
        <CreateTaskModal
          report={selectedReportForTask} // שולח את הדיווח לפופאפ
          onClose={() => {
            setShowTaskModal(false); // סוגר את המודאל
            setSelectedReportForTask(null); // מאפס את הדיווח
          }}
          onSuccess={loadReports} // אחרי יצירה - מרענן את הטבלה
        />
      )}
    </div>
  );
}
