//==================================
//    קומפוננטה חלון פופה לפרטי הדיווח קשורה  לניהול דיווחים מהשטח על ידי מנהל
//(נפתח ברגע שלוחץ על האיקון של פרטי הדיווח בקומפוננטה  ניהול דיווחים מהשטח)
//====================================

import { useState, useEffect } from "react";
import styles from "./reportDetailsModal.module.css";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-gpx";

import API_BASE from "../../config/api";

// =========================
// קומפוננטה ראשית
// =========================
export default function ReportDetailsModal({ report, onClose }) {
  const [showBigMap, setShowBigMap] = useState(false);
  const [showBigImage, setShowBigImage] = useState(false);

  if (!report) return null;

  const position = [report.latitude, report.longitude];

  
  //================================
  //איקון מסויים לנקודת הבעיה המדויקת במפה
  //================================
  // ================= ICONS =================
  // 🚧 חסימה
  const blockedIcon = L.divIcon({
    className: "",
    html: `
    <div style="
      width:36px;
      height:36px;
      background:#f97316;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:18px;
      border:2px solid white;
      box-shadow:0 0 10px rgba(249,115,22,0.8);
    ">
      🚧
    </div>
  `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

  // ⚠️ סכנה
  const dangerIcon = L.divIcon({
    className: "",
    html: `
    <div style="
      width:36px;
      height:36px;
      background:#dc2626;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:18px;
      border:2px solid white;
      box-shadow:0 0 10px rgba(220,38,38,0.8);
    ">
      ⚠️
    </div>
  `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

  // 🛠️ תחזוקה
  const maintenanceIcon = L.divIcon({
    className: "",
    html: `
    <div style="
      width:36px;
      height:36px;
      background:#2563eb;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:18px;
      border:2px solid white;
      box-shadow:0 0 10px rgba(37,99,235,0.8);
    ">
      🛠️
    </div>
  `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

  // 🧹 ניקיון
  const cleanIcon = L.divIcon({
    className: "",
    html: `
    <div style="
      width:36px;
      height:36px;
      background:#16a34a;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:18px;
      border:2px solid white;
      box-shadow:0 0 10px rgba(22,163,74,0.8);
    ">
      🧹
    </div>
  `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
  const getIconByType = (type) => {
    if (!type) return dangerIcon;

    const t = type.trim(); // מנקה רווחים

    switch (t) {
      case "חסימה":
        return blockedIcon;
      case "סכנה":
        return dangerIcon;
      case "תחזוקה":
        return maintenanceIcon;
      case "ניקיון":
        return cleanIcon;
      default:
        return dangerIcon;
    }
  };
  return (
    <>
      {/* =========================
         מודאל ראשי
      ========================= */}
      <div className={styles.modalOverlay}>
        <div className={styles.modal} dir="rtl">
          <h2 className={styles.title}>פרטי הדיווח</h2>

          <p>
            <strong>מספר:</strong> {report.report_id}
          </p>
          <p>
            <strong>סוג:</strong> {report.problem_type}
          </p>
          <p>
            <strong>מדווח:</strong> {report.reporter_name}
          </p>
          <p>
            <strong>טיול:</strong> {report.trail_name}
          </p>

          {/* תאריך ושעה */}
          <p>
            <strong>תאריך:</strong>{" "}
            {new Date(report.report_time).toLocaleDateString("he-IL")}
          </p>
          <p>
            <strong>שעה:</strong>{" "}
            {new Date(report.report_time).toTimeString().slice(0, 5)}
          </p>

          {/* תיאור */}
          <p>
            <strong>תיאור:</strong> {report.description}
          </p>

          {/* תמונה*/}
          {report.image_path && (
            <div
              className={styles.imageWrapper}
              onClick={() => setShowBigImage(true)}
            >
              <img
                src={`${API_BASE}/${report.image_path}`}
                alt="תמונת דיווח"
                className={styles.reportImage}
              />
            </div>
          )}

          {/* =========================
             מפה קטנה
          ========================= */}
          <div
            className={styles.mapWrapper}
            onClick={() => setShowBigMap(true)}
          >
            <MapContainer center={position} zoom={16} className={styles.map}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker
                position={position}
                icon={getIconByType(report.problem_type)}
              />
              <AutoCenter position={position} />
              {report.gpx_file && <GPXLayer fileName={report.gpx_file} />}
            </MapContainer>
          </div>

          <button className={styles.closeBtn} onClick={onClose}>
            סגור
          </button>
        </div>
      </div>

      {/* =========================
         מודאל מפה גדולה
      ========================= */}
      {showBigMap && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowBigMap(false)}
        >
          <div
            className={styles.bigMapModal}
            onClick={(e) => e.stopPropagation()}
          >
            <MapContainer center={position} zoom={17} className={styles.bigMap}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker
                position={position}
                icon={getIconByType(report.problem_type)}
              />
              <AutoCenter position={position} />
              {report.gpx_file && <GPXLayer fileName={report.gpx_file} />}
            </MapContainer>
          </div>
        </div>
      )}

      {/* =========================
   מודאל תמונה גדולה
========================= */}
      {showBigImage && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowBigImage(false)}
        >
          <div
            className={styles.bigImageModal}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`${API_BASE}/${report.image_path}`}
              alt="תמונה גדולה"
              className={styles.bigImage}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* ================= GPX ================= */
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

//===============================
// ממקד את המפה למיקום הדיווח
//===============================
function AutoCenter({ position }) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize(); // 🔥 מתקן את גודל המפה
      map.setView(position, 17); // ממקד למיקום
    }, 200);
  }, [position, map]);

  return null;
}
