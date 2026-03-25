// לניהול הדרכות על ידי מנהל

import { useEffect, useState } from "react";
import styles from "./manageGuidances.module.css";
// ייבוא אייקונים מספריות שונות
import {
  FaEye,
  FaExchangeAlt,
  FaCompass,
  FaCalendarAlt,
  FaFlagCheckered,
} from "react-icons/fa";
import { MdTimer } from "react-icons/md";
import { BsGraphUp } from "react-icons/bs";
import {
  IoCheckmarkCircle,
  IoCloseCircle,
  IoLockClosed,
} from "react-icons/io5";

import API_BASE from "../../config/api";

export default function ManageGuidances() {
  /* =========================
     רשימת הדרכות
  ========================= */
  const [guidances, setGuidances] = useState([]);

  /* =========================
     פילטרים
  ========================= */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  /* =========================
     מודאלים
  ========================= */
  const [selectedGuidance, setSelectedGuidance] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showChangeGuide, setShowChangeGuide] = useState(false);

  /* =========================
     מדריכים פנויים
  ========================= */
  const [availableGuides, setAvailableGuides] = useState([]);
  const [newGuideId, setNewGuideId] = useState("");
  const [reason, setReason] = useState("");

  // מודאל ביטול הדרכה
  const [showCancelModal, setShowCancelModal] = useState(false);

  // סיבת ביטול
  const [cancelReason, setCancelReason] = useState("");

  // מצב לפתיחת תמונה גדולה
  const [showImage, setShowImage] = useState(false);

  /* =========================
     הודעות
  ========================= */
  const [msg, setMsg] = useState({ type: "", text: "" });
  //===============================
  // פתיחת ביטול הדרכה
  //===============================
  function openCancel(g) {
    setSelectedGuidance(g); // שומר הדרכה
    setCancelReason(""); // מאפס סיבה
    setShowCancelModal(true); // פותח מודאל
  }
  // ביטול הדרכה (מעדכן group)
  async function cancelGuidance() {
    // בדיקה אם יש סיבה
    if (!cancelReason.trim()) {
      setMsg({ type: "error", text: "חובה לכתוב סיבה לביטול" });
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/ManageGuidances/cancel/${selectedGuidance.group_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setMsg({ type: "error", text: data.message });
        return;
      }

      // הצלחה
      setMsg({ type: "success", text: "ההדרכה בוטלה" });

      setTimeout(() => {
        setShowCancelModal(false);
        loadGuidances();
      }, 2000);
    } catch {
      setMsg({ type: "error", text: "שגיאה בביטול הדרכה" });
    }
  }

  /* =========================
     טעינת הדרכות
  ========================= */
  useEffect(() => {
    loadGuidances();
  }, []);

  async function loadGuidances() {
    try {
      const res = await fetch(`${API_BASE}/api/ManageGuidances`);
      const data = await res.json();

      console.log("guidances from server:", data);

      if (Array.isArray(data)) {
        setGuidances(data);
      } else if (Array.isArray(data.guidances)) {
        setGuidances(data.guidances);
      } else {
        setGuidances([]);
      }
    } catch {
      setGuidances([]);
    }
  }

  /* =========================
     סינון
  ========================= */
  const filtered = guidances.filter((g) => {
    const matchSearch = g.guide_name
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || g.status === statusFilter;

    let matchTime = true;

    const now = new Date();
    const tripDate = new Date(g.trip_date);

    if (timeFilter === "future") {
      matchTime = tripDate >= now;
    } else if (timeFilter === "history") {
      matchTime = tripDate < now;
    }

    return matchSearch && matchStatus && matchTime;
  });

  /* =========================
     פתיחת פרטים
  ========================= */
  function openDetails(g) {
    setSelectedGuidance(g);
    setShowDetails(true);
  }

  /* =========================
     פתיחת החלפת מדריך
  ========================= */
  async function openChangeGuide(g) {
    setSelectedGuidance(g);
    setShowChangeGuide(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/ManageGuidances/available-guides?date=${g.trip_date}&time=${g.trip_time}`,
      );
      const data = await res.json();
      setAvailableGuides(data);
    } catch {
      setAvailableGuides([]);
    }
  }

  /* =========================
     החלפת מדריך
  ========================= */
  async function changeGuide() {
    if (!newGuideId || !reason.trim()) {
      setMsg({ type: "error", text: "בחר מדריך וכתוב סיבה" });
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/ManageGuidances/change-guide/${selectedGuidance.group_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guide_id: newGuideId,
            reason,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setMsg({ type: "error", text: data.message });
        return;
      }

      setMsg({ type: "success", text: "המדריך הוחלף" });

      // חכה 2 שניות ואז סגור
      setTimeout(() => {
        setShowChangeGuide(false);
        loadGuidances();
      }, 2000);
    } catch {
      setMsg({ type: "error", text: "שגיאה בהחלפת מדריך" });
    }
  }

  /**
   * =================================================
   * טיפול בהודעות הצלחה / שגיאה (היעלמות אוטומטית)
   * =================================================
   *
   */
  useEffect(() => {
    if (!msg.text) return;

    // ⏱ קובע זמן לפי סוג ההודעה
    const duration = msg.type === "success" ? 2000 : 2000;

    const timer = setTimeout(() => {
      setMsg({ type: "", text: "" });
    }, duration);

    return () => clearTimeout(timer);
  }, [msg]);

  /**===================
   * סגירת מודאל ביטול
   * מנקה שדות וטקסטים
   ====================*/
  function closeCancelModal() {
    setShowCancelModal(false);

    setCancelReason(""); // ניקוי טקסט
    setMsg({ type: "", text: "" }); // ניקוי הודעה
  }

  /**=========================
   * סגירת מודאל החלפת מדריך
   =========================*/
  function closeChangeGuideModal() {
    setShowChangeGuide(false);

    setNewGuideId(""); // ניקוי בחירה
    setReason(""); // ניקוי סיבה
    setMsg({ type: "", text: "" });
  }

  /**==================
   * סגירת מודאל פרטים
  =================== */
  function closeDetailsModal() {
    setShowDetails(false);

    setSelectedGuidance(null); // ניקוי נתון
  }

  // המרה מדקות לשעות (תצוגה יפה למשתמש)
  function formatDuration(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hrs === 0) return `${mins} דקות`;
    if (mins === 0) return `${hrs} שעות`;

    return `${hrs} שעות ו-${mins} דקות`;
  }
  //===================================================
  // חישוב ביצוע מול תכנון
  //=======================================================
  function calculateTripStatus(g) {
    if (!g.start_time || !g.end_time || !g.duration_minutes) return null;

    const start = new Date(g.start_time);
    const end = new Date(g.end_time);

    const actualMinutes = Math.round((end - start) / 60000);

    const plannedStart = new Date(g.trip_date);
    const [hours, minutes] = g.trip_time.split(":");
    plannedStart.setHours(hours, minutes);

    const plannedEnd = new Date(
      plannedStart.getTime() + g.duration_minutes * 60000,
    );

    const diff = actualMinutes - g.duration_minutes;

    let status = "";

    if (diff === 0) status = "עמד בזמן";
    else if (diff > 0) status = `איחר ב-${formatDuration(diff)}`;
    else status = `סיים מוקדם ב-${formatDuration(Math.abs(diff))}`;

    // ===============================
    // בדיקה אם התאריך שונה
    // ===============================
    const sameDay = start.toDateString() === plannedStart.toDateString();

    return {
      start,
      end,
      plannedEnd,
      actualMinutes,
      diff,
      status,
      sameDay, // 👈 חשוב!
    };
  }

  /**
------------------------------------------------
חישוב סטטיסטיקות הדרכות
------------------------------------------------
סופר:
- סך הכל הדרכות
- לפי סטטוס: מתוכנן / בתהליך / הסתיים / בוטל
- לפי קושי: קל / בינוני / קשה
*/
  const stats = guidances.reduce(
    (acc, g) => {
      // הגדלת סך הכל
      acc.total++;

      /* =========================
       ספירת סטטוסים
    ========================= */
      if (g.status === "מתוכנן") acc.planned++;
      else if (g.status === "בתהליך") acc.inProgress++;
      else if (g.status === "הסתיים") acc.finished++;
      else if (g.status === "בוטל") acc.cancelled++;

      /* =========================
       ספירת קושי
    ========================= */
      if (g.difficulty === "קל") acc.easy++;
      else if (g.difficulty === "בינוני") acc.medium++;
      else if (g.difficulty === "קשה") acc.hard++;

      return acc;
    },
    {
      // סטטיסטיקות כלליות
      total: 0,

      // סטטוסים
      planned: 0,
      inProgress: 0,
      finished: 0,
      cancelled: 0,

      // קושי
      easy: 0,
      medium: 0,
      hard: 0,
    },
  );

  return (
    <div className={styles.page} dir="rtl">
      {/* כותרת */}
      <div className={styles.topBar}>
        <div className={styles.topBarRow}>
          <h1 className={styles.title}>ניהול הדרכות</h1>

          <div className={styles.statsRow}>
            {/* =========================
     סך הכל
  ========================= */}
            <div className={styles.statBox}>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statLabel}>סה״כ</div>
            </div>

            {/* =========================
     סטטוסים
  ========================= */}

            {/* מתוכנן */}
            <div className={`${styles.statBox} ${styles.plannedBox}`}>
              <div className={styles.statNumber}>{stats.planned}</div>
              <div className={styles.statLabel}>מתוכנן</div>
            </div>

            {/* בתהליך */}
            <div className={`${styles.statBox} ${styles.inProgressBox}`}>
              <div className={styles.statNumber}>{stats.inProgress}</div>
              <div className={styles.statLabel}>בתהליך</div>
            </div>

            {/* הסתיים */}
            <div className={`${styles.statBox} ${styles.finishedBox}`}>
              <div className={styles.statNumber}>{stats.finished}</div>
              <div className={styles.statLabel}>הסתיים</div>
            </div>

            {/* בוטל */}
            <div className={`${styles.statBox} ${styles.cancelledBox}`}>
              <div className={styles.statNumber}>{stats.cancelled}</div>
              <div className={styles.statLabel}>בוטל</div>
            </div>

            {/* סינונים */}
            <div className={styles.filterBox}>
              <input
                className={styles.input}
                placeholder="חיפוש מדריך..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">כל הסטטוסים</option>
                <option value="מתוכנן">מתוכנן</option>
                <option value="בתהליך">בתהליך</option>
                <option value="הסתיים">הסתיים</option>
                <option value="בוטל">בוטל</option>
              </select>

              <select
                className={styles.filterSelect}
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="all">הכל</option>
                <option value="future">עתידיים</option>
                <option value="history">היסטוריה</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* טבלה */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>מדריך</th>
            <th>קבוצה</th>
            <th>מסלול</th>
            <th>תאריך</th>
            <th>שעה</th>
            <th>סטטוס</th>
            <th>פרטים</th>
            <th>פעולות</th>
          </tr>
        </thead>

        <tbody>
          {/* אם אין הדרכות להצגה */}
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="7">אין הדרכות להצגה</td>
            </tr>
          ) : (
            filtered.map((g) => (
              <tr key={g.guidance_id}>
                <td>{g.guide_name}</td>
                <td>{g.group_id}</td>
                <td>{g.trail_name}</td>
                <td>{new Date(g.trip_date).toLocaleDateString("he-IL")}</td>
                <td>{g.trip_time?.slice(0, 5)}</td>
                <td>{g.status}</td>

                <td>
                  {/* אייקון צפייה בפרטים */}
                  <FaEye
                    className={styles.iconBtn}
                    title="צפייה"
                    style={{ cursor: "pointer" }}
                    onClick={() => openDetails(g)}
                  />
                </td>

                <td>
                  <div className={styles.actionsRow}>
                    {/* אייקון החלפת מדריך */}
                    {g.status !== "בוטל" &&
                      g.status !== "הסתיים" &&
                      g.status !== "בתהליך" && (
                        <FaExchangeAlt
                          className={styles.iconBtn}
                          title="החלפת מדריך"
                          style={{ cursor: "pointer", marginRight: "10px" }}
                          onClick={() => openChangeGuide(g)}
                        />
                      )}

                    {/* ביטול הדרכה */}
                    {g.status !== "בוטל" &&
                      g.status !== "הסתיים" &&
                      g.status !== "בתהליך" && (
                        <button
                          className={styles.cancellation}
                          onClick={() => openCancel(g)}
                        >
                          בטל
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* מודאל ביטול הדרכה */}
      {showCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>ביטול הדרכה</h2>

            <textarea
              placeholder="כתוב סיבה לביטול"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />

            {/* הודעה */}
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
              <button onClick={cancelGuidance} className={styles.saveBtn}>
                אשר ביטול
              </button>

              <button onClick={closeCancelModal} className={styles.closeBtn}>
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל פרטים */}
      {showDetails && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>פרטי הדרכה</h2>

            <p>מדריך: {selectedGuidance.guide_name}</p>
            <p>מסלול: {selectedGuidance.trail_name}</p>

            {selectedGuidance.status === "הסתיים" ? (
              <>
                {(() => {
                  const result = calculateTripStatus(selectedGuidance);

                  if (!result) return null;
                  // 🔵 יצירת זמן התחלה מתוכנן
                  const plannedStart = new Date(selectedGuidance.trip_date);

                  const [hours, minutes] =
                    selectedGuidance.trip_time.split(":");

                  plannedStart.setHours(hours, minutes);

                  // 🔵 סיום מתוכנן נכון
                  const plannedEnd = new Date(
                    plannedStart.getTime() +
                      selectedGuidance.duration_minutes * 60000,
                  );

                  // 🔴 בדיקת איחור
                  const isLate = result.diff > 0;

                  return (
                    <>
                      <div className={styles.planning}>
                        <h4>תכנון</h4>
                        {/* משך מתוכנן */}
                        <p>
                          <FaCompass className={styles.icon} />{" "}
                          {/* אייקון מצפן */} משך מתוכנן:{" "}
                          {formatDuration(selectedGuidance.duration_minutes)}
                        </p>
                        {/* התחלה מתוכננת*/}

                        <p className={styles.dateTimeRow}>
                          <MdTimer className={styles.icon} />
                          התחלה מתוכננת:
                          <span className={styles.dateBlock}>
                            <FaCalendarAlt />
                            {plannedStart.toLocaleDateString("he-IL")}
                          </span>
                          <span className={styles.separator}>|</span>
                          <span className={styles.timeBlock}>
                            <MdTimer />
                            {plannedStart.toLocaleTimeString("he-IL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>

                        {/* סיום מתוכנן */}
                        <p className={styles.dateTimeRow}>
                          <FaCalendarAlt className={styles.icon} />
                          סיום מתוכנן:
                          <span className={styles.dateBlock}>
                            <FaCalendarAlt />
                            {plannedEnd.toLocaleDateString("he-IL")}
                          </span>
                          <span className={styles.separator}>|</span>
                          <span className={styles.timeBlock}>
                            <MdTimer />
                            {plannedEnd.toLocaleTimeString("he-IL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                      </div>
                      <div className={styles.acting}>
                        <h4>בפועל</h4>

                        {/* התחלה בפועל */}
                        <p className={styles.dateTimeRow}>
                          <MdTimer className={styles.icon} />
                          התחלה בפועל:
                          <span className={styles.dateBlock}>
                            <FaCalendarAlt />
                            {result.start.toLocaleDateString("he-IL")}
                          </span>
                          <span className={styles.separator}>|</span>
                          <span className={styles.timeBlock}>
                            <MdTimer />
                            {result.start.toLocaleTimeString("he-IL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>

                        {/* סיום בפועל */}
                        <p className={styles.dateTimeRow}>
                          <FaFlagCheckered className={styles.icon} />
                          סיום בפועל:
                          <span className={styles.dateBlock}>
                            <FaCalendarAlt />
                            {result.end.toLocaleDateString("he-IL")}
                          </span>
                          <span className={styles.separator}>|</span>
                          <span className={styles.timeBlock}>
                            <MdTimer />
                            {result.end.toLocaleTimeString("he-IL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>

                        {/* משך בפועל */}
                        <p>
                          <BsGraphUp className={styles.icon} /> {/* גרף */} משך
                          בפועל: {formatDuration(result.actualMinutes)}
                        </p>
                      </div>
                      <div className={styles.resultBox}>
                        <h4>תוצאה</h4>
                        {/* סטטוס */}
                        <p
                          style={{
                            color: result.diff > 0 ? "red" : "green",
                            fontWeight: "bold",
                          }}
                        >
                          {result.diff > 0 ? (
                            <IoCloseCircle className={styles.statusError} />
                          ) : (
                            <IoCheckmarkCircle
                              className={styles.statusSuccess}
                            />
                          )}{" "}
                          {result.status}
                        </p>

                        {/* ===============================
   אזהרה על תאריך שונה
================================ */}
                        {!result.sameDay && (
                          <p style={{ color: "orange", marginTop: "10px" }}>
                            ⚠️ הטיול בוצע בתאריך שונה מהתכנון
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
                <p className={styles.notes}>הערות: {selectedGuidance.notes}</p>

                {/* תמונה קטנה להצגה */}
                {selectedGuidance.image && (
                  <img
                    src={`${API_BASE}/uploads/guidances/${selectedGuidance.image}`}
                    className={styles.smallImage}
                    onClick={() => setShowImage(true)}
                  />
                )}
              </>
            ) : selectedGuidance.status === "בוטל" ? (
              <>
                <p style={{ color: "orange", fontWeight: "bold" }}>
                  ⚠️ ההדרכה בוטלה לפני ההתחלה
                </p>

                <p>סיבה: {selectedGuidance.cancel_reason}</p>
              </>
            ) : (
              <p>ההדרכה עדיין לא הסתיימה</p>
            )}
            <div className={styles.btnRow}>
              <button className={styles.closeBtn} onClick={closeDetailsModal}>
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל החלפת מדריך */}
      {showChangeGuide && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>החלפת מדריך</h2>

            <select
              className={styles.select}
              value={newGuideId}
              onChange={(e) => setNewGuideId(e.target.value)}
            >
              <option value="">בחר מדריך</option>
              {availableGuides.map((g) => (
                <option key={g.user_id} value={g.user_id}>
                  {g.full_name}
                </option>
              ))}
            </select>

            <textarea
              className={styles.textarea}
              placeholder="סיבה להחלפה"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            {/* הודעה */}
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
              <button className={styles.saveBtn} onClick={changeGuide}>
                שמור
              </button>

              <button
                className={styles.closeBtn}
                onClick={closeChangeGuideModal}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל תמונה מוגדלת */}
      {showImage && (
        <div
          className={styles.imageOverlay}
          onClick={() => setShowImage(false)}
        >
          <img
            src={`${API_BASE}/uploads/guidances/${selectedGuidance.image}`}
            className={styles.fullImage}
          />
        </div>
      )}
    </div>
  );
}
