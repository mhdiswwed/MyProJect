//==================================
// קומפוננטה לניהול המסלולים (צד המנהל)
//===================================

import { useEffect, useState } from "react";
import styles from "./managementTrails.module.css";
// אייקונים לכפתורים
import { FaPlus, FaTrash, FaEdit, FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import API_BASE from "../../config/api";

export default function ManagementTrails() {
  // =========================
  // משתנה לשמירת ערך המע״מ
  // =========================
  const [vat, setVat] = useState(0);

  // רשימת המסלולים שמגיעים מהשרת
  const [trails, setTrails] = useState([]);

  // =========================
  // חיפוש לפי שם מסלול
  // =========================
  const [search, setSearch] = useState("");

  // =========================
  // עימוד (pagination)
  // =========================
  const [page, setPage] = useState(1);

  // כמה מסלולים יוצגו בכל עמוד
  const rowsPerPage = 5;

  // האם להציג את חלון המודאל
  const [showModal, setShowModal] = useState(false);

  // הודעת הצלחה / שגיאה למשתמש
  const [msg, setMsg] = useState({ type: "", text: "" });

  // המסלול שנמצא במצב עריכה (null = הוספה)
  const [editingTrail, setEditingTrail] = useState(null);

  // משתנה מצב שאחראי על הצגת/הסתרת חלון אישור מחיקת מסלול
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // מזהה המסלול שמיועד למחיקה
  const [trailToDelete, setTrailToDelete] = useState(null);
  // בדיקה אם אנחנו במצב עדכון
  const isEdit = Boolean(editingTrail);

  // נתוני הטופס (משותף להוספה ולעדכון)
  const [form, setForm] = useState({
    trail_name: "",
    trail_type: "",
    difficulty_level: "",
    length_km: "",
    duration_minutes: "",
    start_point: "",
    end_point: "",
    price_per_person: "",
    price_per_vehicle: "",
    description: "",
    gpx_file: null,
    image: null,
  });

  // =========================
  // שליפת ערך המע״מ מהשרת
  // =========================
  useEffect(() => {
    fetch(`${API_BASE}/api/ManagementTrails/vat`)
      .then((res) => res.json())
      .then((data) => {
        if (data.vat !== undefined) {
          setVat(Number(data.vat));
        }
      })
      .catch(() => {
        console.log("שגיאה בשליפת המע״מ");
      });
  }, []);

  // =========================
  // טעינת כל המסלולים מהשרת
  // =========================
  useEffect(() => {
    fetch(`${API_BASE}/api/ManagementTrails`)
      .then((res) => res.json())
      .then((data) => setTrails(Array.isArray(data) ? data : []));
  }, []);

  // =========================
  // סינון מסלולים לפי חיפוש
  // =========================
  const filteredTrails = trails.filter((t) =>
    (t.trail_name || "").toLowerCase().includes(search.toLowerCase()),
  );

  // =========================
  // חישוב העמוד הנוכחי
  // =========================
  const startIndex = (page - 1) * rowsPerPage;

  // רשימת המסלולים שמוצגים בעמוד
  const paginatedTrails = filteredTrails.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  // =========================
  // שינוי ערכים בטופס (כולל קבצים)
  // =========================
  function handleChange(e) {
    const { name, value, files } = e.target;

    setForm((prev) => ({
      ...prev,
      // אם זה קובץ – שומרים את הקובץ, אחרת ערך רגיל
      [name]: files ? files[0] : value,
    }));
  }

  // =========================
  // שליחת טופס הוספה / עדכון
  // =========================
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    // FormData מאפשר שליחת קבצים
    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== "") {
        formData.append(key, value);
      }
    });

    try {
      // אם יש editingTrail → עדכון, אחרת הוספה
      const res = await fetch(
        isEdit
          ? `${API_BASE}/api/ManagementTrails/${editingTrail.trail_id}`
          : `${API_BASE}/api/ManagementTrails`,
        {
          method: isEdit ? "PUT" : "POST",
          body: formData,
        },
      );

      const data = await res.json();

      // שגיאה מהשרת
      if (!res.ok) {
        setMsg({
          type: "error",
          text: data.error || "❌ שגיאה בשמירת המסלול",
        });
        return;
      }

      // הודעת הצלחה (שונה להוספה / עדכון)
      setMsg({
        type: "success",
        text: isEdit ? "✅ המסלול עודכן בהצלחה" : "✅ המסלול נוסף בהצלחה",
      });

      // רענון הרשימה מהשרת
      const refreshed = await fetch(`${API_BASE}/api/ManagementTrails`);
      const newTrails = await refreshed.json();
      setTrails(newTrails);

      // סגירת מודאל ואיפוס מצב עריכה
      setTimeout(() => {
        setShowModal(false);
        setEditingTrail(null); // חשוב! שלא יישאר מצב עדכון
        setMsg({ type: "", text: "" });
      }, 1200);
    } catch {
      // שגיאת תקשורת
      setMsg({
        type: "error",
        text: "❌ שגיאת תקשורת עם השרת",
      });

      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
    }
  }

  // =========================
  // מחיקת מסלול לפי ID
  // =========================
  async function handleDelete(id) {
    setMsg({ type: "", text: "" });

    try {
      const res = await fetch(`${API_BASE}/api/ManagementTrails/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg({
          type: "error",
          text: data.error || "❌ שגיאה במחיקת המסלול",
        });
        return;
      }

      // הסרה מיידית מה־UI
      setTrails((prev) => prev.filter((t) => t.trail_id !== id));

      // הודעת הצלחה
      setMsg({
        type: "success",
        text: "✅ המסלול נמחק בהצלחה",
      });

      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
    } catch {
      setMsg({
        type: "error",
        text: "❌ שגיאת תקשורת עם השרת",
      });

      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
    }
  }

  // =========================
  // פונקציה לחישוב מחיר כולל מע״מ
  // =========================
  function priceWithVat(price) {
    // אם אין מחיר מחזירים 0
    if (!price) return 0;

    // חישוב המחיר כולל מע״מ
    return (price * (1 + vat / 100)).toFixed(2);
  }

  // =========================
  // פונקציה להמרת דקות לשעות ודקות
  // =========================
  function formatDuration(minutes) {
    // אם אין זמן – מחזירים מקף
    if (!minutes) return "-";

    // חישוב מספר השעות
    const hours = Math.floor(minutes / 60);

    // חישוב מספר הדקות הנותרות
    const remainingMinutes = minutes % 60;

    // אם אין דקות נוספות
    if (remainingMinutes === 0) {
      return `${hours} שעות`;
    }

    // אם יש גם שעות וגם דקות
    return `${hours} שעות ${remainingMinutes} דקות`;
  }

  // =========================
  // מחיקת כל המסלולים
  // =========================
  /*async function handleDeleteAll() {
    setMsg({ type: "", text: "" });

    try {
      const res = await fetch(`${API_BASE}/api/ManagementTrails`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg({
          type: "error",
          text: data.error || "❌ שגיאה במחיקת כל המסלולים",
        });
        return;
      }

      // מנקה את הרשימה ב-UI
      setTrails([]);

      setMsg({
        type: "success",
        text: "✅ כל המסלולים נמחקו בהצלחה",
      });

      setTimeout(() => setMsg({ type: "", text: "" }), 3000);
    } catch {
      setMsg({
        type: "error",
        text: "❌ שגיאת תקשורת עם השרת",
      });
    }
  }*/

  return (
    <div className={styles.page} dir="rtl">
      {/* כותרת */}
      <div className={styles.topBar}>
        {msg.text && (
          <div
            className={`${styles.toast} ${
              msg.type === "success" ? styles.toastSuccess : styles.toastError
            }`}
          >
            {msg.text}
          </div>
        )}
        <h1>ניהול מסלולים</h1>

        <div className={styles.buttonsRow}>
          <button
            className={styles.addBtn}
            onClick={() => {
              setEditingTrail(null);
              setShowModal(true);
            }}
          >
            <FaPlus /> הוספה
          </button>

          {/*<button
            className={styles.addBtn}
            onClick={() => {
              if (
                window.confirm("האם אתה בטוח שברצונך למחוק את כל המסלולים?")
              ) {
                handleDeleteAll();
              }
            }}
          >
            <FaTrash /> מחק הכל
          </button>*/}
        </div>

        {/* ======================
שדה חיפוש באמצע מתחת לכותרת
====================== */}
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="חיפוש לפי שם מסלול..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className={styles.search}
          />
        </div>
      </div>

      {/*הצגת המידע בקרטיסים */}
      <div className={styles.cards}>
        {/* מעבר על כל המסלולים להצגה */}
        {paginatedTrails.map((t) => (
          <div key={t.trail_id} className={styles.card}>
            {/* תמונת המסלול */}
            <img
              className={styles.cardImg}
              src={`${API_BASE}/uploads/images/${t.images}`}
              alt={t.trail_name}
            />

            <div className={styles.cardBody}>
              {/* שם המסלול */}
              <h3 className={styles.cardTitle}>{t.trail_name}</h3>

              {/* מידע כללי על המסלול */}
              <div className={styles.cardInfo}>
                <span>
                  <strong>סוג:</strong> {t.trail_type}
                </span>
                <span>
                  <strong>קושי:</strong> {t.difficulty_level}
                </span>
                <span>
                  <strong>אורך:</strong> {t.length_km} ק"מ
                </span>
                <span>
                  <strong>משך זמן:</strong> {formatDuration(t.duration_minutes)}
                </span>
                <span>
                  <strong>התחלה:</strong> {t.start_point}
                </span>
                <span>
                  <strong>סיום:</strong> {t.end_point}
                </span>
              </div>

              {/* מחירים */}
              <div className={styles.pricesBox}>
                <div className={styles.priceItem}>
                  <strong>מחיר לאדם:</strong>
                  <small>{priceWithVat(t.price_per_person)} ₪ כולל מע״מ</small>
                  <small>לפני מע״מ: {t.price_per_person} ₪</small>
                </div>

                <div className={styles.priceItem}>
                  <strong>מחיר לכלי:</strong>
                  {t.price_per_vehicle ? (
                    <>
                      <small>
                        {priceWithVat(t.price_per_vehicle)} ₪ כולל מע״מ
                      </small>
                      <small>לפני מע״מ: {t.price_per_vehicle} ₪</small>
                    </>
                  ) : (
                    <small>-</small>
                  )}
                </div>
              </div>

              {/* תיאור – שורה אחת + ... + tooltip */}
              <p
                className={styles.cardDesc}
                title={t.description} // מציג את כל התיאור בהובר
              >
                <strong>תיאור:</strong> {t.description || ""}
              </p>

              {/* קישור לקובץ GPX אם קיים */}
              <div className={styles.cardLinks}>
                {t.gpx_file && (
                  <a
                    href={`${API_BASE}/uploads/gpx/${t.gpx_file}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.trackLink}
                  >
                    קובץ עקיבה
                  </a>
                )}
              </div>

              {/* כפתורי פעולה */}
              <div className={styles.actions}>
                {/* עריכה */}
                <button
                  onClick={() => {
                    setEditingTrail(t);
                    setForm({
                      trail_name: t.trail_name,
                      trail_type: t.trail_type,
                      difficulty_level: t.difficulty_level,
                      length_km: t.length_km,
                      duration_minutes: t.duration_minutes,
                      start_point: t.start_point,
                      end_point: t.end_point,
                      price_per_person: t.price_per_person,
                      price_per_vehicle: t.price_per_vehicle || "",
                      description: t.description,
                      gpx_file: null,
                      image: null,
                    });
                    setShowModal(true);
                  }}
                >
                  <FaEdit />
                </button>

                {/* מחיקה */}
                <button
                  onClick={() => {
                    setTrailToDelete(t.trail_id);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =========================
עימוד (מעבר בין עמודים)
========================= */}
      <div className={styles.pagination}>
        {/* כפתור לעמוד הקודם */}
        <button
          className={styles.pageBtn}
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
        >
          <FaChevronLeft />
        </button>

        {/* מספר העמוד הנוכחי */}
        <span className={styles.pageNum}>עמוד {page}</span>

        {/* כפתור לעמוד הבא */}
        <button
          className={styles.pageBtn}
          onClick={() => setPage((p) => p + 1)}
        >
          <FaChevronRight />
        </button>
      </div>

      {/* מודאל הוספה */}
      {showModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <button
              className={styles.close}
              onClick={() => {
                setShowModal(false);
                setEditingTrail(null);
                setForm({
                  trail_name: "",
                  trail_type: "",
                  difficulty_level: "",
                  length_km: "",
                  duration_minutes: "",
                  start_point: "",
                  end_point: "",
                  price_per_person: "",
                  price_per_vehicle: "",
                  description: "",
                  gpx_file: null,
                  image: null,
                });
              }}
            >
              <FaTimes />
            </button>

            <h2>
              {editingTrail
                ? `עדכון מסלול: ${editingTrail.trail_name}`
                : "הוספת מסלול חדש"}
            </h2>

            <form onSubmit={handleSubmit}>
              <input
                name="trail_name"
                value={form.trail_name}
                placeholder="שם מסלול"
                onChange={handleChange}
              />

              <select
                name="trail_type"
                value={form.trail_type}
                onChange={handleChange}
              >
                <option value="">בחר סוג</option>
                <option>רגלי</option>
                <option>גיפים</option>
                <option>טרקטורונים</option>
                <option>סוסים</option>
              </select>

              <select
                name="difficulty_level"
                value={form.difficulty_level}
                onChange={handleChange}
              >
                <option value="">בחר קושי</option>
                <option>קל</option>
                <option>בינוני</option>
                <option>קשה</option>
              </select>

              <input
                type="number"
                name="length_km"
                value={form.length_km}
                placeholder="אורך בק״מ"
                onChange={handleChange}
              />

              <input
                type="number"
                name="duration_minutes"
                value={form.duration_minutes}
                placeholder="משך זמן בדקות"
                onChange={handleChange}
              />
              <input
                name="start_point"
                value={form.start_point}
                placeholder="נקודת התחלה"
                onChange={handleChange}
              />
              <input
                name="end_point"
                value={form.end_point}
                placeholder="נקודת סיום"
                onChange={handleChange}
              />
              <input
                type="number"
                name="price_per_person"
                value={form.price_per_person}
                placeholder="מחיר לאדם"
                onChange={handleChange}
              />

              <input
                type="number"
                name="price_per_vehicle"
                value={form.price_per_vehicle}
                placeholder="מחיר לכלי"
                disabled={form.trail_type === "רגלי"}
                onChange={handleChange}
              />

              <label className={styles.fileLabel}>
                קובץ עקיבה למסלול (GPX)
              </label>
              <input
                type="file"
                name="gpx_file"
                accept=".gpx"
                onChange={handleChange}
              />
              <small className={styles.helpText}>
                יש לבחור קובץ GPX של המסלול
              </small>

              <textarea
                name="description"
                value={form.description}
                placeholder="תיאור מסלול"
                onChange={handleChange}
              />

              <label className={styles.fileLabel}>תמונה למסלול</label>
              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleChange}
              />
              <small className={styles.helpText}>התמונה תוצג למשתמשים</small>

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

              <button type="submit" className={styles.saveBtn}>
                שמור
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===============================
    חלון אישור מחיקת מסלול
=============================== */}
      {showDeleteConfirm && (
        <div className={styles.overlay}>
          <div className={styles.confirmModal}>
            <h3>אישור מחיקה</h3>
            <p>האם אתה בטוח שברצונך למחוק את המסלול?</p>

            <div className={styles.confirmActions}>
              <button
                className={styles.deleteBtn}
                onClick={() => {
                  handleDelete(trailToDelete); // מחיקה בפועל
                  setShowDeleteConfirm(false);
                  setTrailToDelete(null);
                }}
              >
                כן, מחק
              </button>

              <button
                onClick={() => {
                  setShowDeleteConfirm(false); // סגירת המודאל
                  setTrailToDelete(null);
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
