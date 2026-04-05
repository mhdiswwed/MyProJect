/**
 * קומפוננטה: חלון פופאפ לפרטי משימה (עובד)
 * נפתח בלחיצה על האייקון של העין ב-MyTasks
 */

import { useState, useEffect } from "react";
import styles from "./taskDetailsModal.module.css";

import {
  FaCalendarAlt,
  FaClock,
  FaPlay,
  FaFlagCheckered,
} from "react-icons/fa";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-gpx";

import API_BASE from "../../config/api";

export default function TaskDetailsModal({ task, onClose }) {
  // מודאלים נוספים
  const [showBigMap, setShowBigMap] = useState(false);
  const [showBigImage, setShowBigImage] = useState(false);

  // מיקום המשימה
  const position = [task.latitude, task.longitude];

  // מיקום העובד (GPS)
  const [userPosition, setUserPosition] = useState(null);

  /**
   * GPS בזמן אמת
   */
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ================= ICONS =================

  // חסימה
  const blockedIcon = createIcon("#f97316", "🚧");

  // סכנה
  const dangerIcon = createIcon("#dc2626", "⚠️");

  // תחזוקה
  const maintenanceIcon = createIcon("#2563eb", "🛠️");

  // ניקיון
  const cleanIcon = createIcon("#16a34a", "🧹");


  /**
   * אייקון פשוט של מיקום עובד (בלי עיצוב)
   */
  const userIcon = L.divIcon({
    className: "",
    html: `
    <div style="
      font-size:32px;
    ">
      📍
    </div>
  `,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });

  /**
   * מחזיר אייקון לפי סוג
   */
  function getIconByType(type) {
    switch (type?.trim()) {
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
  }

  /**
   * יצירת אייקון מותאם
   */
  function createIcon(color, emoji) {
    return L.divIcon({
      className: "",
      html: `
        <div style="
          width:36px;
          height:36px;
          background:${color};
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          font-size:18px;
          border:2px solid white;
          box-shadow:0 0 10px ${color};
        ">
          ${emoji}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  }

  if (!task) return null;

  return (
    <>
      {/* ================= מודאל ראשי ================= */}
      <div className={styles.modalOverlay}>
        <div className={styles.modal} dir="rtl">
          <h2 className={styles.title}>פרטי המשימה</h2>

          <p>
            <strong>מספר:</strong> {task.task_id}
          </p>
          <p>
            <strong>תפקיד:</strong> {task.role}
          </p>
          <p>
            <strong>טיול:</strong> {task.trail_name}
          </p>
          <p>
            <strong>סוג:</strong> {task.task_type}
          </p>

          <p>
            <strong>תיאור:</strong> {task.description}
          </p>

          {/* זמן התחלה */}
          <p>
            <FaPlay className={styles.FaPlay} /> <strong>זמן התחלה:</strong>{" "}
            <FaCalendarAlt />{" "}
            {task.start_time
              ? new Date(task.start_time).toLocaleDateString("he-IL")
              : "-"}{" "}
            | <FaClock />{" "}
            {task.start_time
              ? new Date(task.start_time).toTimeString().slice(0, 5)
              : "-"}
          </p>

          {/* זמן יעד */}
          <p>
            <FaFlagCheckered className={styles.FaFlagCheckered} />{" "}
            <strong>זמן יעד:</strong> <FaCalendarAlt />{" "}
            {task.end_time
              ? new Date(task.end_time).toLocaleDateString("he-IL")
              : "-"}{" "}
            | <FaClock />{" "}
            {task.end_time
              ? new Date(task.end_time).toTimeString().slice(0, 5)
              : "-"}
          </p>

          {/* ================= תמונה ================= */}
          {task.image_path && (
            <div
              className={styles.imageWrapper}
              onClick={() => setShowBigImage(true)}
            >
              <img
                src={`${API_BASE}/${task.image_path}`}
                className={styles.reportImage}
                alt="תמונה"
              />
            </div>
          )}

          {/* ================= מפה קטנה ================= */}
          <div
            className={styles.mapWrapper}
            onClick={() => setShowBigMap(true)}
          >
            <MapContainer center={position} zoom={16} className={styles.map}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* נקודת המשימה */}
              <Marker
                position={position}
                icon={getIconByType(task.task_type)}
              />

              {/* מיקום עובד */}
              {userPosition && (
                <Marker position={userPosition} icon={userIcon} />
              )}

              <AutoCenter position={userPosition || position} />

              {/* GPX */}
              {task.gpx_file && <GPXLayer fileName={task.gpx_file} />}
            </MapContainer>
          </div>

          <button className={styles.closeBtn} onClick={onClose}>
            סגור
          </button>
        </div>
      </div>

      {/* ================= מפה גדולה ================= */}
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
                icon={getIconByType(task.task_type)}
              />

              {userPosition && (
                <Marker position={userPosition} icon={userIcon} />
              )}

              <AutoCenter position={userPosition || position} />

              {task.gpx_file && <GPXLayer fileName={task.gpx_file} />}
            </MapContainer>
          </div>
        </div>
      )}

      {/* ================= תמונה גדולה ================= */}
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
              src={`${API_BASE}/${task.image_path}`}
              className={styles.bigImage}
              alt="גדול"
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * GPX Layer
 */
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

/**
 * ממקד מפה
 */
function AutoCenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.setView(position, 17);
  }, [position, map]);

  return null;
}
