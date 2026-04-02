import { useState,useEffect } from "react";
import styles from "./reportDetailsModal.module.css";

import { MapContainer, TileLayer, Marker,useMap } from "react-leaflet";
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
          {/* =========================
   תמונת הדיווח
========================= */}
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
              <Marker position={position} />
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
              <Marker position={position} />
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