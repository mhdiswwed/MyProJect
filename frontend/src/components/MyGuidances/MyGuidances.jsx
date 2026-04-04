/**
 * קומפוננטה: ההדרכות שלי (צד המדריך)
 */

import { useEffect, useState } from "react";
import styles from "./myGuidances.module.css";
import API_BASE from "../../config/api";

import {
  FaEye,
  FaPlay,
  FaFlagCheckered,
  FaCamera,
  FaPhone,
  FaWhatsapp,
  FaEnvelope,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";

export default function MyGuidances({ user }) {
  // רשימת ההדרכות
  const [guidances, setGuidances] = useState([]);

  // פילטר סטטוס
  const [filter, setFilter] = useState("all");

  // מודאל פרטים
  const [showDetails, setShowDetails] = useState(false);
  const [selected, setSelected] = useState(null);

  // ==============================
  // ניהול מצב מודאל דיווח והודעות
  // ==============================

  // האם להציג את חלון הדיווח
  const [showReportModal, setShowReportModal] = useState(false);

  // נתוני הדיווח (הערות + תמונה)
  const [reportData, setReportData] = useState({
    notes: "",
    image: null,
  });

  // הודעות הצלחה / שגיאה למשתמש
  const [msg, setMsg] = useState({ type: "", text: "" });

  // משתנה שמחזיק זמן נוכחי (גורם לרינדור מחדש)
  const [now, setNow] = useState(Date.now());

  // נציג קבוצה שנבחר + שליטה על המודאל
  const [selectedRepresentative, setSelectedRepresentative] = useState(null);
  const [showRepresentativeModal, setShowRepresentativeModal] = useState(false);

  //========================================
  // מעדכן את הזמן כל שנייה כדי שהסטופר יזוז
  //======================================
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now()); // כל שנייה → רינדור מחדש
    }, 1000);

    return () => clearInterval(interval); // ניקוי כשיוצאים מהקומפוננטה
  }, []);

  // פונקציה שמחשבת כמה זמן עבר מהתחלת הטיול
  function getTimer(startTime) {
    if (!startTime) return "-"; // אם אין זמן התחלה

    const diff = now - new Date(startTime); // הפרש זמן במילישניות

    const hours = Math.floor(diff / (1000 * 60 * 60)); // שעות
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)); // דקות
    const seconds = Math.floor((diff % (1000 * 60)) / 1000); // שניות

    // מחזיר בפורמט יפה
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  /**=============================
   * שליפת ההדרכות של המדריך
   ==========================*/
  useEffect(() => {
    console.log("USER:", user);
    if (!user) return;

    fetch(`${API_BASE}/api/myGuidances/${user.user_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setGuidances(data);
        else setGuidances([]);
      })
      .catch(() => setGuidances([]));
  }, [user]);

  // ==============================
  // שליחת דיווח לשרת (תמונה + הערות + סיום טיול)
  // ==============================

  async function sendReport() {
    // בדיקה שחובה למלא הכל
    if (!reportData.notes || !reportData.image) {
      setMsg({
        type: "error",
        text: "חובה למלא הערות ולהעלות תמונה",
      });
      return;
    }

    // יצירת FormData לשליחת קובץ
    const formData = new FormData();

    // הכנסת הנתונים
    formData.append("notes", reportData.notes);
    formData.append("image", reportData.image);
    formData.append("group_id", selected.group_id);

    try {
      // שליחה לשרת
      const res = await fetch(`${API_BASE}/api/myGuidances/report`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // אם יש שגיאה
      if (!res.ok) {
        setMsg({
          type: "error",
          text: data.message || "שגיאה בשליחה",
        });
        return;
      }

      // הצלחה
      setMsg({
        type: "success",
        text: "הדיווח נשלח בהצלחה",
      });

      // סגירה אחרי רגע
      setTimeout(() => {
        setShowReportModal(false);
        setGuidances((prev) =>
          prev.map((g) =>
            g.group_id === selected.group_id
              ? {
                  ...g,
                  notes: reportData.notes,
                  images: "uploaded", // מספיק שיהיה לא null
                }
              : g,
          ),
        );
      }, 1500);
    } catch (err) {
      console.error(err);

      setMsg({
        type: "error",
        text: "שגיאה בשרת",
      });
    }
  }

  /**==================
   * סינון לפי סטטוס
   ====================*/
  const filtered = guidances.filter((g) => {
    if (filter === "all") return true;
    return g.guidance_status === filter;
  });

  /**===================
   * פתיחת פרטים
   =============*/
  function openDetails(g) {
    setSelected(g);
    setShowDetails(true);
  }

  /**====================
   * התחלת טיול
   =====================*/
  async function startTrip(id) {
    try {
      const res = await fetch(`${API_BASE}/api/myGuidances/start/${id}`, {
        method: "PUT",
      });

      if (!res.ok) {
        setMsg({ type: "error", text: "שגיאה בהתחלת טיול" });
        return;
      }

      const now = new Date().toISOString(); // זמן עכשיו

      setGuidances((prev) =>
        prev.map((g) =>
          g.group_id === id
            ? {
                ...g,
                guidance_status: "בתהליך",
                start_time: now, // 👈 חשוב!!!
              }
            : g,
        ),
      );
    } catch {
      setMsg({ type: "error", text: "שגיאה בשרת" });
    }
  }
  // ==============================
  // סיום טיול (רק עדכון זמן + סטטוס)
  // ==============================
  async function endTrip(id, g) {
    try {
      const res = await fetch(`${API_BASE}/api/myGuidances/end/${id}`, {
        method: "PUT",
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg({
          type: "error",
          text: data.message || "שגיאה בסיום טיול",
        });
        return;
      }

      // 🔥 טען מחדש נתונים מהשרת
      fetch(`${API_BASE}/api/myGuidances/${user.user_id}`)
        .then((res) => res.json())
        .then((data) => setGuidances(data));

      // פותח מודאל
      setSelected(g);
      setShowReportModal(true);
    } catch (err) {
      console.error(err);
    }
  }
  /**========================
   * מחזיר מחלקת צבע לסטטוס
   =========================*/
  function getStatusClass(status) {
    if (status === "מתוכנן") return styles.planned;
    if (status === "בתהליך") return styles.inProgress;
    if (status === "הסתיים") return styles.finished;
    if (status === "בוטל") return styles.cancelled;
    return "";
  }

  // ==============================
  // בדיקה שהקובץ הוא תמונה בלבד
  // ==============================
  function handleImageChange(e) {
    const file = e.target.files[0];

    if (!file) return;

    // בדיקה לפי סוג הקובץ (MIME TYPE)
    if (!file.type.startsWith("image/")) {
      setMsg({
        type: "error",
        text: "ניתן להעלות רק קבצי תמונה בלבד",
      });

      return;
    }

    // אם עבר בדיקה → שומרים
    setReportData({
      ...reportData,
      image: file,
    });

    // ניקוי הודעות שגיאה
    setMsg({ type: "", text: "" });
  }

  // ==============================
  // המרת דקות לפורמט שעות + דקות
  // ==============================
  function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return "-";

    const hours = Math.floor(minutes / 60); // חישוב שעות
    const mins = minutes % 60; // שארית דקות

    // אם יש גם שעות וגם דקות
    if (hours > 0 && mins > 0) {
      return `${hours} שעות ו-${mins} דקות`;
    }

    // אם רק שעות
    if (hours > 0) {
      return `${hours} שעות`;
    }

    // אם רק דקות
    return `${mins} דקות`;
  }

  // ==============================
  // חישוב סטטוסים (יעיל עם reduce)
  // ==============================

  // משתמשים ב-reduce כדי לעבור על כל ההדרכות פעם אחת בלבד
  const stats = guidances.reduce(
    (acc, g) => {
      // בכל איטרציה מגדילים את סך הכל
      acc.total++;

      // בודקים את הסטטוס של ההדרכה ומעדכנים את המונה המתאים
      if (g.guidance_status === "מתוכנן") {
        acc.planned++; // מגדיל מונה מתוכנן
      } else if (g.guidance_status === "בתהליך") {
        acc.inProgress++; // מגדיל מונה בתהליך
      } else if (g.guidance_status === "הסתיים") {
        acc.finished++; // מגדיל מונה הסתיים
      } else if (g.guidance_status === "בוטל") {
        acc.cancelled++; // מגדיל מונה בוטל
      }

      // מחזירים את האובייקט המעודכן להמשך הלולאה
      return acc;
    },
    {
      // ערכים התחלתיים לפני תחילת הספירה
      total: 0, // סך כל ההדרכות
      planned: 0, // כמה מתוכננות
      inProgress: 0, // כמה בתהליך
      finished: 0, // כמה הסתיימו
      cancelled: 0, // כמה בוטלו
    },
  );

  // פתיחת מודאל פרטי נציג קבוצה
  function openRepresentativeDetails(g) {
    setSelectedRepresentative(g);
    setShowRepresentativeModal(true);
  }

  // המרת מספר ישראלי לפורמט וואטסאפ (972 במקום 0)
  function formatPhoneForWhatsapp(phone) {
    if (!phone) return "";

    let clean = phone.replace(/\D/g, "");

    if (clean.startsWith("0")) {
      return "972" + clean.substring(1);
    }

    return clean;
  }

  /**
   * מחשב שעת סיום לפי תאריך + שעה + משך בדקות
   */
  function getEndDateTime(date, time, duration) {
    if (!date || !time || !duration) return null;

    const start = new Date(`${date}T${time}`);
    return new Date(start.getTime() + duration * 60000);
  }

  return (
    <div className={styles.page} dir="rtl">
      {/* כותרת + פילטר כמו ManageRequests */}
      <div className={styles.topBar}>
        <div className={styles.topBarRow}>
          <h1 className={styles.title}>ההדרכות שלי</h1>
          {/*// ============================== // 
         // תצוגת סטטיסטיקות למעלה //
          ==============================*/}
          <div className={styles.statsRow}>
            {/* סך הכל */}
            <div className={styles.statBox}>
              <div className={styles.statNumber}>
                {stats.total} {/* מציג כמה הדרכות יש בסך הכל */}
              </div>
              <div className={styles.statLabel}>סה״כ</div>
            </div>

            {/* מתוכנן */}
            <div className={`${styles.statBox} ${styles.plannedBox}`}>
              <div className={styles.statNumber}>
                {stats.planned} {/* כמות הדרכות מתוכננות */}
              </div>
              <div className={styles.statLabel}>מתוכנן</div>
            </div>

            {/* בתהליך */}
            <div className={`${styles.statBox} ${styles.inProgressBox}`}>
              <div className={styles.statNumber}>
                {stats.inProgress} {/* כמות הדרכות בתהליך */}
              </div>
              <div className={styles.statLabel}>בתהליך</div>
            </div>

            {/* הסתיים */}
            <div className={`${styles.statBox} ${styles.finishedBox}`}>
              <div className={styles.statNumber}>
                {stats.finished} {/* כמות הדרכות שהסתיימו */}
              </div>
              <div className={styles.statLabel}>הסתיים</div>
            </div>

            {/* בוטל */}
            <div className={`${styles.statBox} ${styles.cancelledBox}`}>
              <div className={styles.statNumber}>
                {stats.cancelled} {/* כמות הדרכות שבוטלו */}
              </div>
              <div className={styles.statLabel}>בוטל</div>
            </div>
        
          <div className={styles.filterBox}>
            <label className={styles.filterLabel}>סינון:</label>

            <select
              className={styles.filterSelect}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">הכל</option>
              <option value="מתוכנן">מתוכנן</option>
              <option value="בתהליך">בתהליך</option>
              <option value="הסתיים">הסתיים</option>
              <option value="בוטל">בוטל</option>
            </select>
          </div>
        </div>
        </div>
      </div>
      {/* טבלה כמו ManageRequests */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>קבוצה</th>
            <th>נציג קבוצה</th>
            <th>מסלול</th>
            <th>סוג</th>
            <th>משתתפים</th>
            <th>רכבים</th>
            <th>זמנים (שעת התחלה וסיום מתוכננים)</th>
            <th>מפגש</th>
            <th>סטטוס</th>
            <th>פעולות</th>
            <th>פרטים</th>
          </tr>
        </thead>

        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="11">אין הדרכות להצגה</td>
            </tr>
          ) : (
            filtered.map((g) => (
              <tr
                key={g.group_id}
                className={(() => {
                  const now = new Date();
                  const tripDate = new Date(g.trip_date);

                  // מאפסים שעות
                  now.setHours(0, 0, 0, 0);
                  tripDate.setHours(0, 0, 0, 0);

                  const diffDays = (tripDate - now) / (1000 * 60 * 60 * 24);

                  // 🔥 קרוב (יומיים קדימה)
                  const isUrgent = diffDays >= 0 && diffDays <= 2;

                  // 🔥 רק אם זה עדיין לא הסתיים / בוטל
                  const isActive =
                    g.guidance_status === "מתוכנן" ||
                    g.guidance_status === "בתהליך";

                  const shouldBlink = isUrgent && isActive;

                  return shouldBlink ? styles.urgentRow : "";
                })()}
              >
                <td>{g.group_id}</td>
                <td>
                  <span
                    style={{ cursor: "pointer", color: "#38bdf8" }}
                    onClick={() => openRepresentativeDetails(g)}
                  >
                    {g.user_name}
                  </span>
                </td>
                <td>{g.trail_name}</td>
                <td>{g.trail_type}</td>
                <td>{g.number_of_participants}</td>
                <td>{g.number_of_vehicles}</td>

                <td>
                  {/* התחלה */}
                  <div className={styles.timeRow}>
                    <FaPlay title="התחלה" className={styles.FaPlay} /> <FaCalendarAlt />{" "}
                    {new Date(g.trip_date).toLocaleDateString("he-IL")}
                    {" | "}
                    <FaClock /> {g.trip_time?.slice(0, 5)}
                  </div>

                  {/* סיום מחושב */}
                  <div className={styles.timeRow}>
                    <FaFlagCheckered title="סיום" className={styles.FaFlagCheckered} />{" "}
                    <FaCalendarAlt />{" "}
                    {(() => {
                      if (!g.trip_date || !g.trip_time || !g.duration_minutes)
                        return "-";

                      const start = new Date(g.trip_date);

                      // מוסיפים את השעה לתאריך
                      start.setHours(
                        Number(g.trip_time.slice(0, 2)),
                        Number(g.trip_time.slice(3, 5)),
                      );

                      // חישוב סיום
                      const end = new Date(
                        start.getTime() + g.duration_minutes * 60000,
                      );

                      return end.toLocaleDateString("he-IL");
                    })()}
                    {" | "}
                    <FaClock />{" "}
                    {(() => {
                      if (!g.trip_date || !g.trip_time || !g.duration_minutes)
                        return "-";

                      const start = new Date(g.trip_date);

                      start.setHours(
                        Number(g.trip_time.slice(0, 2)),
                        Number(g.trip_time.slice(3, 5)),
                      );

                      const end = new Date(
                        start.getTime() + g.duration_minutes * 60000,
                      );

                      return end.toTimeString().slice(0, 5);
                    })()}
                  </div>
                </td>

                <td>{g.meeting_point}</td>

                {/* סטטוס */}
                <td>
                  <span
                    className={`${styles.status} ${getStatusClass(
                      g.guidance_status,
                    )}`}
                  >
                    {g.guidance_status}
                  </span>
                  {/* אם הטיול בתהליך → מציג סטופר */}
                  {g.guidance_status === "בתהליך" && (
                    <span>
                      <div className={styles.timer}>
                        ⏱ {getTimer(g.start_time)}
                      </div>
                    </span>
                  )}
                </td>

                {/* פעולות */}
                <td>
                  {g.guidance_status === "מתוכנן" && (
                    <button
                      className={styles.approveBtn}
                      onClick={() => startTrip(g.group_id)}
                    >
                      <FaPlay className={styles.btnIcon} />
                      התחלה
                    </button>
                  )}
                  {/*============================== 
                 כפתור סיום טיול - פותח מודאל דיווח 
                   ==============================*/}
                  {g.guidance_status === "בתהליך" && (
                    <button
                      className={styles.cancelBtn}
                      onClick={() => endTrip(g.group_id, g)}
                    >
                      <FaFlagCheckered className={styles.btnIcon} />
                      סיום
                    </button>
                  )}

                  {/*============================== 
                 כפתור דיווח מופיע רק אם המדריך לא שלח דיווח ברגע שנפתח לו חלון פופה ברגע שלחץ על סיום 
                   ==============================*/}
                  {g.guidance_status === "הסתיים" &&
                    (!g.notes || !g.images) && (
                      <button
                        className={styles.reportBtn}
                        onClick={() => {
                          setSelected(g);
                          setShowReportModal(true);
                        }}
                      >
                        <FaCamera className={styles.btnIcon} />
                        שלח דיווח
                      </button>
                    )}
                </td>

                {/* פרטים */}
                <td>
                  <FaEye
                    className={styles.iconBtn}
                    style={{ cursor: "pointer" }}
                    onClick={() => openDetails(g)}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* מודאל פרטי ההדרכה */}
      {showDetails && selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* // ============================== 
            // פרטי קשר של נציג הקבוצה //
            ==============================*/}
            <h2>פרטי הטיול</h2>
            <p>
              <strong>שם נציג:</strong> {selected.user_name}
            </p>
            <p>
              <strong>טלפון:</strong> {selected.user_phone}
            </p>
            <p>
              <strong>אימייל:</strong> {selected.user_email}
            </p>
            <hr />
            <p>
              <strong>מסלול:</strong> {selected.trail_name}
            </p>
            <p>
              <strong>תיאור:</strong> {selected.description}
            </p>
            <p>
              <strong>קושי:</strong> {selected.difficulty_level}
            </p>
            <p>
              <strong>משך טיול:</strong>{" "}
              {formatDuration(selected.duration_minutes)}
            </p>
            <p>
              <strong>משתתפים:</strong> {selected.number_of_participants}
            </p>
            <p>
              <strong>רכבים:</strong> {selected.number_of_vehicles}
            </p>
            <p>
              <strong>תאריך:</strong>{" "}
              {new Date(selected.trip_date).toLocaleDateString("he-IL")}
            </p>
            <p>
              <strong>שעה:</strong> {selected.trip_time?.slice(0, 5)}
            </p>
            {/* ==============================
   כפתורי מודאל (מרכז למטה)
============================== */}
            <div className={styles.modalActions}>
              <button
                className={styles.closeBtn}
                onClick={() => setShowDetails(false)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ==============================
       מודאל דיווח סיום הדרכה 
      ==============================*/}
      {showReportModal && selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>דיווח סיום הדרכה</h2>

            {/* העלאת תמונה */}
            <div className={styles.reportSection}>
              <label className={styles.reportLabel}>העלאת תמונה</label>

              {/* ==============================
 העלאת תמונה בלבד
============================== */}
              <input
                type="file"
                accept="image/*" // 👈 מאפשר רק תמונות
                className={styles.reportFile}
                onChange={handleImageChange}
              />
            </div>

            {/* הערות */}
            <div className={styles.reportSection}>
              <label className={styles.reportLabel}>הערות מהשטח</label>

              <textarea
                className={styles.reportTextarea}
                placeholder="כתוב הערות מהטיול..."
                value={reportData.notes}
                onChange={(e) =>
                  setReportData({
                    ...reportData,
                    notes: e.target.value,
                  })
                }
              />
            </div>

            {/* הודעות */}
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
              <button className={styles.saveBtn} onClick={sendReport}>
                סיום ושלח דיווח
              </button>

              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowReportModal(false);
                  setReportData({ notes: "", image: null });
                  setMsg({ type: "", text: "" });
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל פרטי נציג קבוצה */}
      {showRepresentativeModal && selectedRepresentative && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>פרטי נציג קבוצה</h2>

            <p>
              <strong>שם:</strong> {selectedRepresentative.user_name}
            </p>

            <p>
              <strong>טלפון:</strong>{" "}
              {selectedRepresentative.user_phone ? (
                <>
                  <a href={`tel:${selectedRepresentative.user_phone}`}>
                    <FaPhone className={styles.phoneIcon} />
                  </a>
                  {selectedRepresentative.user_phone}{" "}
                  <a
                    href={`https://wa.me/${formatPhoneForWhatsapp(
                      selectedRepresentative.user_phone,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaWhatsapp className={styles.whatsappIcon} />
                  </a>
                </>
              ) : (
                "לא קיים"
              )}
            </p>

            <p>
              <strong>אימייל:</strong>{" "}
              {selectedRepresentative.user_email ? (
                <>
                  <a href={`mailto:${selectedRepresentative.user_email}`}>
                    <FaEnvelope className={styles.emailIcon} />
                  </a>
                  {selectedRepresentative.user_email}
                </>
              ) : (
                "לא קיים"
              )}
            </p>

            <div className={styles.modalActions}>
              <button
                className={styles.closeBtn}
                onClick={() => setShowRepresentativeModal(false)}
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
