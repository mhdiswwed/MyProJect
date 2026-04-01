//===================================
// קומפוננטה לניהול קבוצות על ידי מנהל
//====================================

import { useEffect, useState } from "react";
import styles from "./manageGroups.module.css";
import API_BASE from "../../config/api";
import UpdateGroupModal from "../UpdateGuideModal/UpdateGuideModal";

import {
  FaEye,
  FaCheck,
  FaTimes,
  FaEdit,
  FaEnvelope,
  FaTrash,
  FaPhone,
  FaWhatsapp,
  FaRoute,
} from "react-icons/fa";





export default function ManageGroups() {
  /* =========================
     קבוצות
  ========================= */
  const [groups, setGroups] = useState([]);

  /* =========================
     פילטר
  ========================= */
  const [filter, setFilter] = useState("all");

  /* =========================
     הודעות מערכת
  ========================= */
  const [msg, setMsg] = useState({ type: "", text: "" });
  // =========================
  // מצבים למודאלים של ביטול
  // =========================

  // האם להציג מודאל אישור ביטול
  const [showApproveCancelModal, setShowApproveCancelModal] = useState(false);

  // האם להציג מודאל דחיית ביטול
  const [showRejectCancelModal, setShowRejectCancelModal] = useState(false);
  /* =========================
   מודאלים
========================= */
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  /* =========================
   קבוצה נבחרת
========================= */
  const [selectedGroup, setSelectedGroup] = useState(null);

  /* =========================
   שדות מודאלים
========================= */
  const [reason, setReason] = useState("");

  const [editData, setEditData] = useState({
    trip_date: "",
    trip_time: "",
    meeting_point: "",
    guide_id: "",
  });

  // =========================
  // מצב להצגת מודאל הודעות
  // =========================
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  // =========================
  // מערך הודעות להצגה
  // =========================
  const [messages, setMessages] = useState([]);

  // =========================
  // משתמש שנבחר (נציג קבוצה)
  // =========================
  const [selectedUser, setSelectedUser] = useState(null);

  // =========================
  // האם להציג מודאל פרטי משתמש
  // =========================
  const [showUserModal, setShowUserModal] = useState(false);

  // מצב האם הפופאפ פתוח
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  /* =========================
     טעינת קבוצות
  ========================= */
  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      const res = await fetch(`${API_BASE}/api/ManageGroups`);
      const data = await res.json();

      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "שגיאה בטעינת קבוצות" });
    }
  }

  /**
   * =========================================
   * דחיית ביטול קבוצה
   * =========================================
   * שולח לשרת סיבה לדחייה
   * מעדכן הודעה
   * מרענן נתונים
   */
  async function rejectCancel(requestId) {
    try {
      // שליחת בקשת PUT לשרת עם סיבה
      const res = await fetch(
        `${API_BASE}/api/ManageGroups/rejectCancel/${requestId}`,
        {
          method: "PUT", // סוג הבקשה
          headers: {
            "Content-Type": "application/json", // מציין JSON
          },
          body: JSON.stringify({
            reason, // שליחת הסיבה מה-state
          }),
        },
      );

      // המרת תשובה ל-JSON
      const data = await res.json();

      setMsg({
        type: res.ok ? "success" : "error",
        text: data.message,
      });

      if (res.ok) {
        loadGroups();

        setTimeout(() => {
          setShowRejectCancelModal(false);
          setSelectedGroup(null);
          setReason("");
          clearMsg();
        }, 2000);
      }
    } catch (err) {
      // טיפול בשגיאה
      setMsg({ type: "error", text: "שגיאה בדחיית ביטול" });
    }
  }

  /**
   * =========================================
   * אישור ביטול קבוצה
   * =========================================
   * שולח בקשה לשרת לאשר ביטול
   * מעדכן הודעה למשתמש
   * טוען מחדש את הקבוצות
   * סוגר מודאל
   */
  async function approveCancel(requestId) {
    try {
      // שליחת בקשת PUT לשרת
      const res = await fetch(
        `${API_BASE}/api/ManageGroups/approveCancel/${requestId}`,
        {
          method: "PUT", // סוג הבקשה
        },
      );

      // המרת תשובת השרת ל-JSON
      const data = await res.json();

      // הצגת הודעת הצלחה למשתמש
      setMsg({
        type: res.ok ? "success" : "error",
        text: data.message,
      });

      if (res.ok) {
        loadGroups();

        setTimeout(() => {
          setShowApproveCancelModal(false);
          setSelectedGroup(null);
          clearMsg();
        }, 2000);
      }
    } catch (err) {
      // במקרה של שגיאה
      setMsg({ type: "error", text: "שגיאה באישור ביטול" });
    }
  }

  // =========================================
  // ביטול קבוצה (מנהל)
  // =========================================
  async function cancelGroup() {
    // בדיקה: אם אין סיבה → לא מאפשרים שליחה
    if (!reason.trim()) {
      setMsg({ type: "error", text: "חובה להזין סיבה" });
      return;
    }

    try {
      // שליחת בקשת PUT לשרת
      const res = await fetch(
        `${API_BASE}/api/ManageGroups/cancel/${selectedGroup.group_id}`,
        {
          method: "PUT", // סוג הבקשה
          headers: {
            "Content-Type": "application/json", // שליחת JSON
          },
          body: JSON.stringify({
            reason, // שליחת הסיבה
          }),
        },
      );

      // המרת תשובת השרת ל-JSON
      const data = await res.json();

      // הצגת הודעת הצלחה בתוך המודאל
      setMsg({ type: "success", text: data.message });

      // רענון הנתונים בטבלה
      loadGroups();

      // ❗ חשוב: לא סוגרים מיד → מחכים כדי לראות הודעה
      setTimeout(() => {
        setShowCancelModal(false); // סגירת מודאל
        setSelectedGroup(null); // ניקוי קבוצה
        setReason(""); // ניקוי סיבה
        setMsg({ type: "", text: "" }); // ניקוי הודעה
      }, 2300);
    } catch (err) {
      // במקרה של שגיאה
      setMsg({ type: "error", text: "שגיאה בביטול קבוצה" });
    }
  }

  // =========================================
  // פתיחת מודאל ביטול קבוצה
  // =========================================
  function openCancelModal(group) {
    clearMsg(); //ניקוי הודעות
    setSelectedGroup(group); // שמירת הקבוצה שנבחרה
    setReason(""); // איפוס סיבה
    setMsg({ type: "", text: "" }); // איפוס הודעות
    setShowCancelModal(true); // פתיחת המודאל
  }

  /**
   * =========================================
   * פתיחת חלון פרטי נציג קבוצה
   * =========================================
   * שומר את המשתמש שנבחר
   * ופותח את המודאל
   */
  function openUserDetails(group) {
    setSelectedUser(group); // שומר את הנתונים של הנציג
    setShowUserModal(true); // פותח את החלון
  }

  /**
   * =========================================
   * המרת מספר לפורמט בינלאומי ל-WhatsApp
   * =========================================
   * 0501234567 -> 972501234567
   */
  function formatPhoneForWhatsapp(phone) {
    if (!phone) return "";

    // מוריד רווחים ומקפים
    let clean = phone.replace(/\D/g, "");

    // אם מתחיל ב-0 → מחליפים ל-972
    if (clean.startsWith("0")) {
      return "972" + clean.substring(1);
    }

    return clean;
  }

  /**
   * =========================================
   * פתיחת חלון הודעות של קבוצה
   * =========================================
   * הפונקציה בונה רשימת הודעות לפי הנתונים
   * שמגיעים מהשרת (לא טבלת הודעות אמיתית)
   */
  function openMessages(group) {
    // יצירת מערך ריק להודעות
    const msgs = [];

    // =========================
    // הודעה: משתמש ביקש ביטול
    // =========================
    if (group.cancel_reason) {
      msgs.push({
        sender: "משתמש",
        text: "בקשת ביטול: " + group.cancel_reason,
      });
    }

    // =========================
    // הודעה: מנהל דחה ביטול
    // =========================
    if (group.cancel_reject_reason) {
      msgs.push({
        sender: "מנהל",
        text: "דחיית ביטול: " + group.cancel_reject_reason,
      });
    }

    // =========================
    // הודעה: בקשה נדחתה
    // =========================
    if (group.reject_reason) {
      msgs.push({
        sender: "מנהל",
        text: "דחיית בקשה: " + group.reject_reason,
      });
    }

    // =========================
    // הודעה: קבוצה בוטלה
    // =========================
    if (group.status === "בוטל") {
      msgs.push({
        sender: "מערכת",
        text: "הקבוצה בוטלה",
      });
    }

    // =========================
    // שמירת ההודעות ופתיחת מודאל
    // =========================
    setMessages(msgs);
    setShowMessagesModal(true);
  }

  /* =========================
     חישוב סטטיסטיקות
  ========================= */
  const stats = groups.reduce(
    (acc, g) => {
      acc.total++;

      if (g.status === "פעיל") acc.active++;
      else if (g.status === "מבקש ביטול") acc.cancelRequests++;
      else if (g.status === "הסתיים") acc.finished++;
      else if (g.status === "בוטל") acc.cancelled++;

      return acc;
    },
    {
      total: 0,
      active: 0,
      cancelRequests: 0,
      finished: 0,
      cancelled: 0,
    },
  );

  /* =========================
     סינון
  ========================= */
  const filteredGroups = groups.filter((g) => {
    if (filter === "all") return true;
    if (filter === "active") return g.status === "פעיל";
    if (filter === "cancelRequest") return g.status === "מבקש ביטול";
    if (filter === "finished") return g.status === "הסתיים";
    if (filter === "cancelled") return g.status === "בוטל";
    return true;
  });

  /* =========================
     חישוב שעת סיום
  ========================= */
  function calculateEndTime(startTime, duration) {
    if (!startTime || !duration) return "";

    const [h, m] = startTime.split(":").map(Number);
    const total = h * 60 + m + duration;

    const endH = Math.floor(total / 60);
    const endM = total % 60;

    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }

  // =========================================
  // שליפת מדריכים פנויים לפי תאריך ושעה
  // =========================================
  async function loadAvailableGuides(date, time, duration) {
    try {
      const res = await fetch(
        `${API_BASE}/api/ManageGroups/available-guides?trip_date=${date}&trip_time=${time}&duration_minutes=${duration}`,
      );

      const data = await res.json();

      // שומר מדריכים
      setGuides(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("שגיאה בשליפת מדריכים", err);
    }
  }

  // =====================================
  // פתיחת מודאל אישור ביטול
  // =====================================
  function openApproveCancelModal(group) {
    clearMsg(); //ניקוי הודעות
    // שמירת הקבוצה שנבחרה
    setSelectedGroup(group);
    // פתיחת המודאל
    setShowApproveCancelModal(true);
  }

  // =====================================
  // פתיחת מודאל דחיית ביטול
  // =====================================
  function openRejectCancelModalSimple(group) {
    clearMsg(); //ניקוי הודעות
    // שמירת הקבוצה שנבחרה
    setSelectedGroup(group);
    // ניקוי סיבה קודמת
    setReason("");
    // פתיחת המודאל
    setShowRejectCancelModal(true);
  }

  // =========================================
  // ניקוי הודעת מערכת
  // =========================================
  function clearMsg() {
    setMsg({ type: "", text: "" });
  }

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.topBar}>
        <div className={styles.topBarRow}>
          <h1 className={styles.title}>ניהול קבוצות</h1>

          {/* סטטיסטיקות */}
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statLabel}>סה״כ</div>
            </div>

            <div className={`${styles.statBox} ${styles.plannedBox}`}>
              <div className={styles.statNumber}>{stats.active}</div>
              <div className={styles.statLabel}>פעיל</div>
            </div>

            <div className={`${styles.statBox} ${styles.inProgressBox}`}>
              <div className={styles.statNumber}>{stats.cancelRequests}</div>
              <div className={styles.statLabel}>מבקש ביטול</div>
            </div>

            <div className={`${styles.statBox} ${styles.finishedBox}`}>
              <div className={styles.statNumber}>{stats.finished}</div>
              <div className={styles.statLabel}>הסתיים</div>
            </div>

            <div className={`${styles.statBox} ${styles.cancelledBox}`}>
              <div className={styles.statNumber}>{stats.cancelled}</div>
              <div className={styles.statLabel}>בוטל</div>
            </div>

            {/* פילטר */}
            <div className={styles.filterBox}>
              <label className={styles.filterLabel}>סינון:</label>

              <select
                className={styles.filterSelect}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">כל הקבוצות</option>
                <option value="active">פעיל</option>
                <option value="cancelRequest">מבקש ביטול</option>
                <option value="finished">הסתיים</option>
                <option value="cancelled">בוטל</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      {/* טבלה */}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>מס׳ קבוצה</th>
            <th>נציג קבוצה</th>
            <th>טיול</th>
            <th>מדריך</th>
            <th>תאריך ושעה</th>
            <th>נקודת מפגש</th>
            <th>סטטוס</th>
            <th>הודעות</th>
            <th>פעולות</th>
          </tr>
        </thead>

        <tbody>
          {filteredGroups.length === 0 ? (
            <tr>
              <td colSpan="8">אין קבוצות להצגה</td>
            </tr>
          ) : (
            filteredGroups.map((g) => {
              const endTime = calculateEndTime(
                g.trip_time?.slice(0, 5),
                g.duration_minutes,
              );

              return (
                <tr key={g.group_id}>
                  <td>{g.group_id}</td>
                  <td>
                    {/* שם הנציג - לחיץ */}
                    <span
                      style={{ cursor: "pointer", color: "#38bdf8" }} // עיצוב לחיץ
                      onClick={() => openUserDetails(g)} // פתיחת מודאל
                    >
                      {g.user_name}
                    </span>
                  </td>
                  <td>{g.trail_name}</td>

                  <td>{g.guide_name || "לא שובץ"}</td>

                  <td>
                    <div>
                      <div>
                        {new Date(g.trip_date).toLocaleDateString("he-IL")}
                      </div>
                      <div className={styles.timeRow}>
                        {g.trip_time?.slice(0, 5)} - {endTime}
                      </div>
                    </div>
                  </td>

                  <td>{g.meeting_point}</td>

                  <td>{g.status}</td>

                  {/* =========================================
                   כפתור צפייה בהודעות (עין)
                  ========================================= */}
                  <td>
                    <FaEye
                      title="צפייה בהודעות" // טולטיפ כשעוברים עם העכבר
                      style={{ cursor: "pointer" }} // הופך לסמן לחיץ
                      onClick={() => openMessages(g)} // פתיחת ההודעות של הקבוצה
                    />
                  </td>

                  <td>
                    <div className={styles.actionsRow}>
                      {/* מבקש ביטול */}
                      {g.status === "מבקש ביטול" && (
                        <>
                          {/* כפתור אישור ביטול */}
                          <button
                            className={styles.cancelBtn}
                            title="אשר ביטול"
                            onClick={() => openApproveCancelModal(g)}
                          >
                            <FaCheck />
                          </button>

                          {/* כפתור דחיית ביטול */}
                          <button
                            className={styles.rejectCancelBtn}
                            title="דחה ביטול"
                            onClick={() => openRejectCancelModalSimple(g)} // 🔥 תיקון
                          >
                            <FaTimes />
                          </button>
                        </>
                      )}

                      {/* פעיל */}
                      {g.status === "פעיל" &&
                        g.guidance_status === "מתוכנן" && (
                          <>
                            <button
                              className={`${styles.actionBtn} ${styles.editBtn}`}
                              title="עדכן קבוצה"
                              onClick={() => {
                                // שומר את הקבוצה שנבחרה
                                setSelectedGroup(g);

                                // פותח את הפופאפ
                                setShowUpdateModal(true);
                              }}
                            >
                              <FaEdit />
                            </button>

                            <button
                              className={`${styles.actionBtn} ${styles.cancelsBtn}`}
                              title="בטל קבוצה"
                              onClick={() => openCancelModal(g)}
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}

                      {/* יצאו לטיול */}
                      {g.status === "פעיל" &&
                        g.guidance_status === "בתהליך" && (
                          <span className={styles.inProgressText}>
                            <FaRoute /> הקבוצה נמצאת בטיול
                          </span>
                        )}

                      {/* הסתיים / בוטל */}
                      {(g.status === "הסתיים" ||
                        g.status === "בוטל" ||
                        g.guidance_status === "הסתיים") && <span>—</span>}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* מודאל דחיית ביטול*/}
      {showRejectCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* כותרת */}
            <h2 className={styles.modalTitle}>דחיית בקשת ביטול</h2>

            {/* שדה סיבה */}
            <textarea
              className={styles.textarea}
              placeholder="כתוב סיבה לדחיית הביטול"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

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

            {/* כפתורים */}
            <div className={styles.modalActions}>
              {/* כפתור דחייה */}
              <button
                className={styles.deleteBtn}
                onClick={() => rejectCancel(selectedGroup.request_id)}
              >
                דחה ביטול
              </button>

              {/* כפתור סגירה */}
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowRejectCancelModal(false);
                  setSelectedGroup(null);
                }}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
      {/*// ===================================================== // 
        // מודאל אישור ביטול בקשה 
      // =====================================================*/}
      {showApproveCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* כותרת */}
            <h2 className={styles.modalTitle}>אישור ביטול קבוצה</h2>

            {/* טקסט */}
            <p>האם אתה בטוח שברצונך לאשר את ביטול הקבוצה?</p>

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

            {/* כפתורים */}
            <div className={styles.modalActions}>
              {/* כפתור אישור */}
              <button
                className={styles.saveBtn}
                onClick={() => approveCancel(selectedGroup.request_id)}
              >
                אישור
              </button>

              {/* כפתור סגירה */}
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowApproveCancelModal(false);
                  setSelectedGroup(null);
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל ביטול קבוצה*/}
      {showCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* כותרת */}
            <h2>ביטול קבוצה</h2>

            {/* שדה סיבה */}
            <textarea
              placeholder="סיבה"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            {/* =========================================
             הודעת מערכת בתוך המודאל
             מוצגת מעל הכפתורים
            ========================================= */}
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

            {/* =========================================
             כפתורים
              ========================================= */}
            <div className={styles.btnRow}>
              {/* כפתור שליחה */}
              <button className={styles.saveBtn} onClick={cancelGroup}>
                שלח
              </button>

              {/* כפתור סגירה */}
              <button
                className={styles.closeBtn}
                onClick={() => setShowCancelModal(false)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
       מודאל להצגת הודעות הקבוצה
      ========================================= */}
      {showMessagesModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* כותרת */}
            <h2>הודעות קבוצה</h2>

            {/* אם אין הודעות */}
            {messages.length === 0 && <p>אין הודעות להצגה</p>}

            {/* הצגת כל ההודעות */}
            {messages.map((m, index) => (
              <div key={index} style={{ marginBottom: "10px" }}>
                <strong>{m.sender}:</strong>
                <div>{m.text}</div>
              </div>
            ))}

            {/* כפתור סגירה */}
            <div className={styles.btnRow}>
              <button
                className={styles.closeBtn}
                onClick={() => setShowMessagesModal(false)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
       מודאל פרטי נציג קבוצה
      ========================================= */}
      {showUserModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* כותרת */}
            <h2>פרטי נציג קבוצה</h2>

            {/* שם */}
            <p>
              <strong>שם:</strong> {selectedUser?.user_name}
            </p>

            {/* =========================
               טלפון
              ========================= */}
            <p>
              <strong>טלפון:</strong>{" "}
              {selectedUser?.phone ? (
                <>
                  {/* אייקון טלפון */}
                  <a href={`tel:${selectedUser.phone}`} title="התקשר">
                    <FaPhone className={styles.phoneIcon} />
                  </a>
                  {/* רווח קטן */} {/* המספר */}
                  {selectedUser.phone}
                  {/* רווח */} {/* אייקון WhatsApp */}
                  <a
                    href={`https://wa.me/${formatPhoneForWhatsapp(selectedUser.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    title="שלח וואטסאפ"
                  >
                    <FaWhatsapp className={styles.whatsappIcon} />
                  </a>
                </>
              ) : (
                "לא קיים"
              )}
            </p>

            {/* =========================
             אימייל
            ========================= */}
            <p>
              <strong>אימייל:</strong>{" "}
              {selectedUser?.email ? (
                <>
                  {/* אייקון אימייל */}
                  <a href={`mailto:${selectedUser.email}`} title="שלח מייל">
                    <FaEnvelope className={styles.emailIcon} />
                  </a>{" "}
                  {/* האימייל */}
                  {selectedUser.email}
                </>
              ) : (
                "לא קיים"
              )}
            </p>

            {/* כפתור סגירה */}
            <div className={styles.btnRow}>
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
         פופאפ עדכון קבוצה
      ========================= */}
      {showUpdateModal && selectedGroup && (
        <UpdateGroupModal
          // מעביר את הקבוצה שנבחרה לפופאפ
          group={selectedGroup}
          // סגירת הפופאפ
          onClose={() => {
            setShowUpdateModal(false); // סוגר חלון
            setSelectedGroup(null); // מנקה קבוצה
          }}
          // אחרי עדכון מוצלח
          onSuccess={() => {
            loadGroups(); // רענון טבלה
          }}
        />
      )}
    </div>
  );
}
