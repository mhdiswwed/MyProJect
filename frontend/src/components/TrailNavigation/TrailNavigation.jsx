/**
 * TrailNavigation.jsx
 * ניווט שטח בזמן אמת + דיווח בעיה
 */

import { FaArrowRight } from "react-icons/fa";
import styles from "./trailNavigation.module.css";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-gpx";
import API_BASE from "../../config/api";
// ייבוא פונקציית format מספריית date-fns לעבודה תקינה עם תאריך ושעה
import { format } from "date-fns";

export default function TrailNavigation({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trail, setTrail] = useState(null);
  const [position, setPosition] = useState(null);
  const [gpsError, setGpsError] = useState(false);

  // ===== סטייטים לדיווח =====
  const [showReport, setShowReport] = useState(false);
  const [problemType, setProblemType] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [reportMsg, setReportMsg] = useState({ type: "", text: "" });


  /* =====================================
     טעינת מסלול
  ===================================== */
  useEffect(() => {
    fetch(`${API_BASE}/api/trailNavigation/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("שגיאה בטעינת מסלול");
        return res.json();
      })
      .then((data) => setTrail(data))
      .catch((err) => console.error(err));
  }, [id]);

  /* =====================================
     GPS בזמן אמת
  ===================================== */
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError(true);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(false);
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        setGpsError(true);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /* =====================================
     שליחת דיווח - בדיקות כמו בשרת (וגם)
  ===================================== */
  async function submitReport() {
    const errors = [];

    // 1) התחברות
    if (!user) errors.push("צריך להתחבר");

    // 2) GPS
    if (!position) errors.push("חסר מיקום GPS");

    // 3) סוג בעיה
    if (!problemType) errors.push("חובה לבחור סוג בעיה");

    // 4) תיאור
    if (!description) errors.push("חובה להזין תיאור");

    // 5) תמונה חובה לפי דרישות
    if (!image) errors.push("חובה לצרף תמונה");

    // אם יש שגיאות – מציגים הודעה אחת עם " וגם "
    if (errors.length > 0) {
      setReportMsg({ type: "error", text: errors.join(" וגם ") });
      return;
    }

    const formData = new FormData();
    formData.append("user_id", user.user_id);
    formData.append("latitude", position[0]);
    formData.append("longitude", position[1]);
    formData.append("problem_type", problemType);
    formData.append("description", description);
    formData.append("image", image); // חובה

    try {
      const res = await fetch(`${API_BASE}/api/trailNavigation/${id}/report`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      // אם השרת מחזיר message – נקרא אותו
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setReportMsg({
          type: "error",
          text: data.message || "שגיאה בשליחת הדיווח",
        });
        return;
      }

      setReportMsg({
        type: "success",
        text: data.message || "הדיווח נשלח בהצלחה",
      });

      setTimeout(() => {
        setShowReport(false);
        setProblemType("");
        setDescription("");
        setImage(null);
        setReportMsg({ type: "", text: "" });
      }, 1500);
    } catch (err) {
      console.error(err);
      setReportMsg({ type: "error", text: "שגיאת רשת / שרת לא זמין" });
    }
  }

  if (!trail) return <div className={styles.loading}>טוען ניווט...</div>;

  return (
    <div className={styles.page}>
      {/* כפתור חזרה */}
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        <FaArrowRight className={styles.backIcon} />
        חזרה
      </button>

      {/* מפה */}
      <MapContainer center={[32.95, 35.35]} zoom={15} className={styles.map}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {trail.gpx_file && <GPXLayer fileName={trail.gpx_file} />}

        {position && (
          <>
            <Marker position={position} />
            <AutoCenter position={position} />
          </>
        )}
      </MapContainer>

      {/* הודעת GPS */}
      {gpsError && (
        <div className={styles.infoBar}>לא ניתן לקרוא מיקום GPS</div>
      )}

      {/* כפתור דיווח */}
      {position && (
        <button
          className={styles.reportBtn}
          onClick={() => {
            setReportMsg({ type: "", text: "" });
            setShowReport(true);
          }}
        >
          דווח בעיה כאן
        </button>
      )}

      {/* פס מיקום */}
      {position && (
        <div className={styles.infoBar}>
          {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </div>
      )}

      {/* ================= MODAL ================= */}
      {showReport && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowReport(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <button
              className={styles.modalClose}
              onClick={() => setShowReport(false)}
            >
              ✕
            </button>

            <h2 className={styles.modalTitle}>דיווח בעיה מהשטח</h2>

            <div className={styles.modalForm}>
              <select
                value={problemType}
                onChange={(e) => setProblemType(e.target.value)}
              >
                <option value="">בחר סוג בעיה</option>
                <option value="סכנה">סכנה</option>
                <option value="חסימה">חסימה</option>
                <option value="פציעה">פציעה</option>
                <option value="לכלוך">לכלוך</option>
              </select>

              <textarea
                placeholder="תיאור הבעיה"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <label className={styles.uploadBtn}>
                בחר או צלם תמונה (חובה)
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </label>

              {image && (
                <div className={styles.fileHint}>נבחר קובץ: {image.name}</div>
              )}

              {reportMsg.text && (
                <div
                  className={
                    reportMsg.type === "success" ? styles.success : styles.error
                  }
                >
                  {reportMsg.text}
                </div>
              )}

              <button className={styles.submitBtn} onClick={submitReport}>
                שלח דיווח
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= GPX Layer ================= */
function GPXLayer({ fileName }) {
  const map = useMap();

  useEffect(() => {
    const gpx = new L.GPX(`${API_BASE}/uploads/gpx/${fileName}`, {
      async: true,
    }).on("loaded", (e) => {
      map.fitBounds(e.target.getBounds());
    });

    gpx.addTo(map);
    return () => map.removeLayer(gpx);
  }, [fileName, map]);

  return null;
}

/* ================= Auto Center ================= */
function AutoCenter({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, 17);
  }, [position, map]);

  return null;
}
