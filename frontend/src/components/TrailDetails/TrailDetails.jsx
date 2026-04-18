//==========================================================
//קומפוננטה להצגת פרטים מסלול מסויים כולל חלון פופה לבקשות ליציאה לטיול כולל נייוט
//=========================================================

// קומפוננטה לבחירת תאריך ושעה
import DatePicker from "react-datepicker";

// ייבוא פונקציית format מספריית date-fns לעיצוב תאריך
import { format } from "date-fns";

// ייבוא קומפוננטת מפה להצגת מסלול
import TrailMap from "../Trailmap/TrailMap";

// קובץ עיצוב של DatePicker
import "react-datepicker/dist/react-datepicker.css";

// אייקון לוח שנה
import { FaCalendarAlt } from "react-icons/fa";

// רישום שפה עברית ל-DatePicker
import { registerLocale } from "react-datepicker";
import he from "date-fns/locale/he";
registerLocale("he", he);

// אייקון של שעון
import { FaClock } from "react-icons/fa";

// Hooks של React לניהול state וחיי הקומפוננטה
import { useEffect, useState } from "react";

// קריאת פרמטרים מה-URL וניווט בין עמודים
import { useParams, useNavigate } from "react-router-dom";

// קובץ CSS מקומי של הקומפוננטה
import styles from "./TrailDetails.module.css";

// אייקון חזרה
import { FaArrowRight } from "react-icons/fa";

import API_BASE from "../../config/api";

// קומפוננטה להצגת פרטי מסלול
export default function TrailDetails({ user }) {
  // הדפסת המשתמש לקונסול (בדיקה)
  console.log(user);

  // קבלת id של המסלול מהכתובת
  const { id } = useParams();

  // פונקציית ניווט לעמוד קודם
  const navigate = useNavigate();

  // הגדרת סטייטים (נתונים דינמיים)
  const [trail, setTrail] = useState(null); // פרטי המסלול
  const [mainImage, setMainImage] = useState(null); // תמונה ראשית
  const [showRequest, setShowRequest] = useState(false); // הצגת חלון בקשה
  const [participants, setParticipants] = useState(""); // מספר משתתפים
  const [vehicles, setVehicles] = useState(""); // מספר רכבים
  const [selectedGuide, setSelectedGuide] = useState(""); // מדריך שנבחר
  const [tripTime, setTripTime] = useState(null); // שעה שנבחרה
  const [tripDate, setTripDate] = useState(null); // תאריך שנבחר
  const [error, setError] = useState(""); // שגיאות
  const [guides, setGuides] = useState([]); // רשימת מדריכים
  // הודעה למשתמש עבור בקשת הצטרפות (הצלחה / שגיאה)
  const [requestMsg, setRequestMsg] = useState({ type: "", text: "" });
  // הודעה למשתמש (הצלחה / שגיאה)
  const [msg, setMsg] = useState({ type: "", text: "" });

  // ערך המע״מ מהמערכת
  const [vat, setVat] = useState(0);

  // state לשמירת מזהה הקבוצה הפעילה של המשתמש במסלול
  const [groupId, setGroupId] = useState(null);

  // ===============================
  // שמירת מינימום ומקסימום משתתפים מהמערכת
  // ===============================
  const [minParticipants, setMinParticipants] = useState(1); // ברירת מחדל
  const [maxParticipants, setMaxParticipants] = useState(100); // ברירת מחדל
  // שעות פעילות מערכת מהשרת
  const [workingStart, setWorkingStart] = useState("");
  const [workingEnd, setWorkingEnd] = useState("");
  //=================================
  // שליפת שעות פעילות מהמערכת
  //================================
  useEffect(() => {
    fetch(`${API_BASE}/api/SystemSettings`)
      .then((res) => res.json())
      .then((data) => {
        setWorkingStart(data.working_hours_start);
        setWorkingEnd(data.working_hours_end);
      });
  }, []);

  // ===============================
  // שליפת מינימום ומקסימום משתתפים מהשרת
  // ===============================
  useEffect(() => {
    fetch(`${API_BASE}/api/TrailDetailsAndrequests/participants-limits`)
      .then((res) => res.json()) // המרת תשובה ל־JSON
      .then((data) => {
        // שמירת הערכים ב־state
        if (data.min !== undefined) setMinParticipants(data.min);
        if (data.max !== undefined) setMaxParticipants(data.max);
      })
      .catch(() => console.log("שגיאה בשליפת מגבלות משתתפים"));
  }, []);

  // שליפת המע״מ מהשרת
  useEffect(() => {
    fetch(`${API_BASE}/api/TrailDetailsAndrequests/vat`)
      .then((res) => res.json())
      .then((data) => {
        if (data.vat !== undefined) {
          setVat(Number(data.vat));
        }
      })
      .catch(() => console.log("שגיאה בשליפת המע״מ"));
  }, []);

  /* =====================================
   שליפת קבוצה פעילה של המשתמש במסלול
   אם יש טיול פעיל → נקבל group_id
   אם אין → נקבל null
===================================== */
  useEffect(() => {
    if (!user) return;

    fetch(
      `${API_BASE}/api/TrailDetailsAndrequests/active-group/${id}/${user.user_id}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setGroupId(data.groupId);
      })
      .catch(() => {
        setGroupId(null);
      });
  }, [user, id]);

  // ===============================
  // שליפת מדריכים פנויים לפי בחירה
  // ===============================
  useEffect(() => {
    if (!tripDate || !tripTime) return;

    const date = format(tripDate, "yyyy-MM-dd");
    const time = tripTime.toTimeString().slice(0, 5);

    fetch(
      `${API_BASE}/api/TrailDetailsAndrequests/available-guides?trip_date=${date}&trip_time=${time}&trail_id=${id}`,
    )
      .then((res) => res.json())
      .then((data) => setGuides(data));
  }, [tripDate, tripTime]);

  // טעינת פרטי המסלול לפי id
  useEffect(() => {
    fetch(`${API_BASE}/api/TrailDetailsAndrequests/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("מסלול לא נמצא");
        return res.json();
      })
      .then((data) => {
        setTrail(data);

        // אם התמונות מגיעות כמחרוזת – הופכים למערך
        const imgs = Array.isArray(data.images)
          ? data.images
          : data.images.split(",");

        // קביעת תמונה ראשית
        setMainImage(imgs[0]);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  // הצגת הודעת שגיאה אם קיימת
  if (error) return <div className={styles.error}>{error}</div>;

  // אם הנתונים עדיין לא נטענו – מציגים טעינה
  if (!trail) return <div className={styles.loading}>טוען...</div>;
  // בדיקה האם קיים קובץ מעקב למסלול
  const hasTrackFile = Boolean(trail.gpx_file);

  // וידוא שהתמונות הן מערך
  const images = Array.isArray(trail.images)
    ? trail.images
    : trail.images.split(",");

  // פונקציה לשליחת בקשת הצטרפות
  const handleSubmitRequest = async () => {
    // אם המשתמש לא מחובר
    if (!user) {
      // הצגת הודעה למשתמש – אי אפשר לשלוח בקשה בלי התחברות
      setRequestMsg({ type: "error", text: "יש להתחבר כדי לשלוח בקשה למסלול" });
      //מעביר אותו להתחבר
      setTimeout(() => navigate("/login"), 3500);
      return;
    }

    const body = {
      user_id: user.user_id,
      trail_id: id,
      // המרת התאריך לפורמט YYYY-MM-DD בעזרת date-fns כדי למנוע בעיית אזור זמן (UTC)
      trip_date: tripDate ? format(tripDate, "yyyy-MM-dd") : "",
      trip_time: tripTime ? tripTime.toTimeString().slice(0, 5) : "",
      number_of_participants: Number(participants),
      number_of_vehicles: Number(vehicles) || 0,
      guide_id: selectedGuide,
    };

    // שליחת POST לשרת
    const res = await fetch(`${API_BASE}/api/TrailDetailsAndrequests/request`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    // טיפול בתשובת השרת
    if (res.ok) {
      // הודעת הצלחה לאחר שליחת הבקשה
      setRequestMsg({
        type: "success",
        text: "הבקשה נשלחה בהצלחה",
      });
      setMsg({
        type: "success",
        text: "הבקשה נשלחה בהצלחה ✅",
      });

      // סגירת החלון אחרי שהמשתמש רואה את ההודעה
      setTimeout(() => {
        setShowRequest(false);
        setMsg({ type: "", text: "" });
      }, 2400);
    } else {
      // הודעת שגיאה שמגיעה מהשרת
      setRequestMsg({
        type: "error",
        text: data.message || "שגיאה בשליחת הבקשה",
      });
    }
  };
  //========================
  // פונקציה לחישוב מחיר כולל מע״מ
  //=======================
  function priceWithVat(price) {
    if (!price) return 0;
    return (price * (1 + vat / 100)).toFixed(2);
  }

  // =========================
  // המרת דקות לשעות ודקות
  // =========================
  function formatDuration(minutes) {
    if (!minutes) return "-";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
      return `${hours} שעות`;
    }

    return `${hours} שעות ו-${mins} דקות`;
  }

  // ===============================
  // חישוב תאריך מחר (לחסום היום)
  // ===============================
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // בדיקה אם הזמן בתוך שעות מערכת
  function isValidTime(date) {
    if (!date || !workingStart || !workingEnd) return false;

    const hour = date.getHours();
    const minutes = date.getMinutes();

    const [startH, startM] = workingStart.split(":").map(Number);
    const [endH, endM] = workingEnd.split(":").map(Number);

    const total = hour * 60 + minutes;
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    return total >= startTotal && total <= endTotal;
  }

  // =========================
  // בדיקה שהמסלול מסתיים עד שעה דינמית מותציגת
  // =========================
function isValidEndTime(startDate, durationMinutes) {
  if (!startDate || !workingEnd) return false;

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  const [endH, endM] = workingEnd.split(":").map(Number);

  const endLimit = endH * 60 + endM;
  const actualEnd = endDate.getHours() * 60 + endDate.getMinutes();

  return actualEnd <= endLimit;
}

  return (
    <div className={styles.page} dir="rtl">
      {/* כפתור חזרה לעמוד הקודם */}
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        <FaArrowRight className={styles.backIcon} />
        חזרה
      </button>

      {/* אזור תמונה ראשית */}
      <div className={styles.hero}>
        <img src={`${API_BASE}/uploads/images/${mainImage}`} />
        <div className={styles.heroOverlay}>
          <h1>{trail.trail_name}</h1>
          <p>{trail.trail_type}</p>
        </div>
      </div>

      <div className={styles.card}>
        {/* גלריית תמונות */}
        <div className={styles.mapGallery}>
          <div className={styles.mapItem}>
            {images.map((img, i) => (
              <img
                key={i}
                src={`${API_BASE}/uploads/images/${img}`}
                onClick={() => setMainImage(img)} // החלפת תמונה ראשית
                className={styles.thumb}
              />
            ))}
          </div>
        </div>

        {/* אזור מפת המסלול */}
        <section className={styles.mapSection}>
          <h3>מפת המסלול</h3>

          {/* אם קיים קובץ מעקב – מציגים מפה */}
          {hasTrackFile ? (
            <TrailMap fileName={trail.gpx_file} />
          ) : (
            <p className={styles.noMap}>לא קיימת מפת מסלול</p>
          )}
        </section>
        {/* כפתור ניווט בשטח */}
        {hasTrackFile && (
          <div className={styles.navigationBtnWrapper}>
            <button
              className={styles.navigationBtn}
              onClick={() => {
                // תמיד ניווט לפי מסלול
                if (groupId) {
                  navigate(
                    `/trail-navigation/${trail.trail_id}?groupId=${groupId}`,
                  );
                } else {
                  navigate(`/trail-navigation/${trail.trail_id}`);
                }
              }}
            >
              התחל ניווט בשטח
            </button>
          </div>
        )}

        {/* תיאור המסלול */}
        <p className={styles.desc}>{trail.description}</p>

        {/* מידע על המסלול */}
        <div className={styles.infoGrid}>
          <div className={styles.infoBox}>
            <span>התחלה</span>
            <strong>{trail.start_point}</strong>
          </div>
          <div className={styles.infoBox}>
            <span>סיום</span>
            <strong>{trail.end_point}</strong>
          </div>
          <div className={styles.infoBox}>
            <span>אורך</span>
            <strong>{trail.length_km} ק"מ</strong>
          </div>

          <div className={styles.infoBox}>
            <span>משך זמן משוער</span>
            <strong>{formatDuration(trail.duration_minutes)}</strong>
          </div>

          <div className={styles.infoBox}>
            <span>קושי</span>
            <strong>{trail.difficulty_level}</strong>
          </div>
          <div className={styles.infoBox}>
            <span>מחיר לאדם</span>
            <strong>{priceWithVat(trail.price_per_person)} ₪ כולל מע״מ</strong>
            <small>לפני מע״מ: {trail.price_per_person} ₪</small>
          </div>

          {/* אם המסלול לא רגלי – הצגת מחיר לכלי */}
          {trail.trail_type !== "רגלי" && trail.price_per_vehicle && (
            <div className={styles.infoBox}>
              <span>מחיר לכלי</span>
              <strong>
                {priceWithVat(trail.price_per_vehicle)} ₪ כולל מע״מ
              </strong>
              <small>לפני מע״מ: {trail.price_per_vehicle} ₪</small>
            </div>
          )}
        </div>

        {/* פתיחת חלון בקשה */}
        <div className={styles.cta}>
          <button onClick={() => setShowRequest(true)}>בקשה להצטרפות</button>
        </div>
      </div>

      {/* חלון קופץ לבקשת הצטרפות */}
      {showRequest && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowRequest(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* כפתור סגירה */}
            <button
              className={styles.modalClose}
              onClick={() => {
                setShowRequest(false);
                setRequestMsg({ type: "", text: "" });
              }}
            >
              ✕
            </button>

            <h2 className={styles.modalTitle}>בקשת הצטרפות למסלול</h2>

            <div className={styles.modalForm}>
              {/* מספר משתתפים */}
              <div className={styles.timeNote}>
                מינימום משתתפים: {minParticipants} | מקסימום משתתפים:{" "}
                {maxParticipants}
              </div>
              <input
                type="number"
                min={minParticipants} // לא מאפשר פחות מהמינימום
                max={maxParticipants} // לא מאפשר יותר מהמקסימום
                placeholder="מספר משתתפים"
                value={participants}
                onChange={(e) => {
                  const value = Number(e.target.value); // המרה למספר

                  setParticipants(value); // שמירה ב־state

                  // ===============================
                  // בדיקות בזמן אמת
                  // ===============================

                  // פחות מהמינימום
                  if (value < minParticipants) {
                    setRequestMsg({
                      type: "error",
                      text: `המינימום הוא ${minParticipants} משתתפים`,
                    });
                  }

                  // יותר מהמקסימום
                  else if (value > maxParticipants) {
                    setRequestMsg({
                      type: "error",
                      text: `המקסימום הוא ${maxParticipants} משתתפים`,
                    });
                  }

                  // תקין → מנקה הודעה
                  else {
                    setRequestMsg({ type: "", text: "" });
                  }
                }}
              />
              {/* מספר כלים – רק אם המסלול לא רגלי */}
              {trail.trail_type !== "רגלי" && (
                <input
                  type="number"
                  min="0"
                  placeholder="מספר כלים"
                  value={vehicles}
                  onChange={(e) => setVehicles(e.target.value)}
                />
              )}
              {/* בחירת תאריך */}
              {/* ===============================
               DatePicker תאריך (חוסם היום והעבר)
               =============================== */}
              <div className={styles.dateWrapper}>
                <DatePicker
                  selected={tripDate}
                  onChange={(date) => setTripDate(date)}
                  locale="he"
                  dateFormat="dd/MM/yyyy"
                  placeholderText="בחר תאריך"
                  className={styles.dateInput}
                  minDate={tomorrow} // 🔥 זה המקום הנכון!
                />
                <FaCalendarAlt className={styles.dateIcon} />
              </div>
              {/* בחירת שעה */}
              {/* הסבר למשתמש */}
              <small className={styles.timeNote}>
                שעות הפעילות הן בין {workingStart} ל־{workingEnd}. השעות המוצגות
                הן שעות התחלה אפשריות כך שהטיול יסתיים עד {workingEnd}.
              </small>
              <div className={styles.dateWrapper}>
                <FaClock className={styles.dateIcon} />

                <DatePicker
                  selected={tripTime}
                  // =========================
                  // שינוי שעה עם בדיקה
                  // =========================
                  onChange={(date) => {
                    // בדיקת שעות עבודה
                    if (!isValidTime(date)) {
                      setRequestMsg({
                        type: "error",
                        text: "ניתן לבחור שעות בין 08:00 ל־18:00 בלבד",
                      });
                      setTripTime(null);
                      return;
                    }

                    // בדיקה שהמסלול לא חורג מ־18:00
                    if (!isValidEndTime(date, trail.duration_minutes)) {
                      setRequestMsg({
                        type: "error",
                        text: "שעת ההתחלה לא תקינה – המסלול יסתיים אחרי 18:00 אל תבחר שעה ידנית תבחר מתוך הרשימה",
                      });
                      setTripTime(null);
                      return;
                    }

                    setTripTime(date);
                  }}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={5}
                  dateFormat="HH:mm"
                  placeholderText="בחר שעה"
                  className={styles.dateInput}
                  minTime={
                    workingStart
                      ? (() => {
                          const [h, m] = workingStart.split(":").map(Number);
                          const d = new Date();
                          d.setHours(h, m, 0, 0); 
                          return d;
                        })()
                      : (() => {
                          const d = new Date();
                          d.setHours(8, 0, 0, 0);
                          return d;
                        })()
                  }
                  maxTime={
                    workingEnd
                      ? new Date(
                          new Date().setHours(
                            ...workingEnd.split(":").map(Number),
                          ) -
                            trail.duration_minutes * 60000,
                        )
                      : new Date().setHours(18, 0, 0, 0)
                  }
                  customInput={<input readOnly className={styles.dateInput} />}
                />
              </div>
              {/* בחירת מדריך */}
              <select
                value={selectedGuide}
                onChange={(e) => setSelectedGuide(e.target.value)}
              >
                <option value="">בחר מדריך</option>
                {guides.map((g) => (
                  <option key={g.user_id} value={g.user_id}>
                    {g.full_name}
                  </option>
                ))}
              </select>
              {/* הודעת הצלחה / שגיאה למשתמש */}
              {requestMsg.text && (
                <div
                  className={
                    requestMsg.type === "success"
                      ? styles.success
                      : styles.error
                  }
                >
                  {requestMsg.text}
                </div>
              )}
              {/* כפתור שליחה */}
              <button
                className={styles.submitBtn}
                onClick={handleSubmitRequest}
              >
                שלח בקשה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
