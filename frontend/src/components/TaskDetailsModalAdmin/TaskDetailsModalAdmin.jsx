// =============================================
// קומפוננטה:חלון פופה פרטי משימה - צד מנהל
// מציגה את כל פרטי המשימה + מבצעים + יצירת קשר
// TaskManagement נפתח ברגע שלוחץ על כפתור העין בעמודת פרטים בקומפוננטה של ניהול משימות
// =============================================

import { useState,useEffect } from "react";
import styles from "./taskDetailsModalAdmin.module.css";

import {
  FaCalendarAlt,
  FaClock,
  FaPlay,
  FaFlagCheckered,
  FaTools,
  FaExclamationTriangle,
  FaPhone,
  FaWhatsapp,
  FaEnvelope,
} from "react-icons/fa";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-gpx";

import API_BASE from "../../config/api";

export default function TaskDetailsModalAdmin({ task, onClose }) {
  // =========================
  // מודאלים פנימיים
  // =========================
  const [showBigMap, setShowBigMap] = useState(false);
  const [showBigImage, setShowBigImage] = useState(false);

  // =========================
  // מודאל פרטי משתמש
  // =========================
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // =========================
  // בדיקה אם יש מיקום
  // =========================
  const hasLocation =
    task?.latitude &&
    task?.longitude &&
    task.latitude !== 0 &&
    task.longitude !== 0;

  const position = [task.latitude, task.longitude];

  // =========================
  // קביעת מקור משימה
  // =========================
  const isFromReport = task?.report_id;
  const sourceText = isFromReport ? "מדיווח" : "ידני";

  // =========================
  // אייקון לפי מקור
  // =========================
  const SourceIcon = isFromReport ? FaExclamationTriangle : FaTools;

  // =========================
  // עובדים של המשימה (נשלפים מהשרת)
  // =========================
  const [workers, setWorkers] = useState([]);

  // =========================
  // פתיחת מודאל עובד
  // =========================
  function openUserDetails(user) {
    setSelectedUser(user);
    setShowUserModal(true);
  }

  // =========================
  // שליפת עובדים לפי task_id
  // =========================
  useEffect(() => {
    if (!task?.task_id) return;

    fetch(`${API_BASE}/api/TaskManagement/${task.task_id}/workers`)
      .then((res) => res.json())
      .then((data) => setWorkers(data))
      .catch(() => setWorkers([]));
  }, [task]);


  // =========================
  // פורמט טלפון לוואטסאפ
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
  // אייקון לפי סוג משימה
  // =========================
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
        ">
          ${emoji}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  }

  function getIconByType(type) {
    switch (type?.trim()) {
      case "חסימה":
        return createIcon("#f97316", "🚧");
      case "סכנה":
        return createIcon("#dc2626", "⚠️");
      case "תחזוקה":
        return createIcon("#2563eb", "🛠️");
      case "ניקיון":
        return createIcon("#16a34a", "🧹");
      default:
        return createIcon("#dc2626", "⚠️");
    }
  }

  if (!task) return null;

  return (
    <>
      {/* ================= מודאל ראשי ================= */}
      <div className={styles.modalOverlay}>
        <div className={styles.modal} dir="rtl">
          <h2 className={styles.title}>פרטי המשימה</h2>

          {/* ================= פרטים כלליים ================= */}
          <p>
            <strong>מספר משימה:</strong> {task.task_id}
          </p>

          <p>
            <strong>טיול:</strong> {task.trail_name}
          </p>

          <p>
            <strong>סוג:</strong> {task.task_type}
          </p>

          <p>
            <SourceIcon /> <strong>מקור:</strong> {sourceText}
          </p>

          <p>
            <strong>תיאור:</strong> {task.description}
          </p>

          {/* ================= זמנים ================= */}
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

          <p>
            <FaFlagCheckered className={styles.FaFlagCheckered} />{" "}
            <strong>זמן סיום:</strong> <FaCalendarAlt />{" "}
            {task.due_time
              ? new Date(task.due_time).toLocaleDateString("he-IL")
              : "-"}{" "}
            | <FaClock />{" "}
            {task.due_time
              ? new Date(task.due_time).toTimeString().slice(0, 5)
              : "-"}
          </p>

          {/* ================= תמונה ================= */}
          {task.image && (
            <div
              className={styles.imageWrapper}
              onClick={() => setShowBigImage(true)}
            >
              <img
                src={`${API_BASE}/${task.image}`}
                className={styles.reportImage}
                alt="תמונה"
              />
            </div>
          )}

          {/* ================= מפה ================= */}
          {hasLocation && (
            <div
              className={styles.mapWrapper}
              onClick={() => setShowBigMap(true)}
            >
              <MapContainer center={position} zoom={16} className={styles.map}>
                <AutoCenter position={position} />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                <Marker
                  position={position}
                  icon={getIconByType(task.task_type)}
                />

                {/* GPX */}
                {task.gpx_file && <GPXLayer fileName={task.gpx_file} />}
              </MapContainer>
            </div>
          )}

          {/* ================= מבצעים ================= */}
          <h3 style={{ marginTop: "15px" }}>מבצעים בשטח</h3>

          {workers.length > 0 ? (
            workers.map((w, index) => (
              <div key={index} style={{ marginBottom: "8px" }}>
                <span
                  style={{ cursor: "pointer", color: "#38bdf8" }}
                  onClick={() => openUserDetails(w)}
                >
                  {w.full_name}
                </span>{" "}
                - {w.role}
              </div>
            ))
          ) : (
            <p>אין מבצעים</p>
          )}

          {/* ================= כפתור סגירה ================= */}
          <button className={styles.closeBtn} onClick={onClose}>
            סגור
          </button>
        </div>
      </div>

      {/* ================= מודאל מפה גדולה ================= */}
      {showBigMap && hasLocation && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowBigMap(false)}
        >
          <div
            className={styles.bigMapModal}
            onClick={(e) => e.stopPropagation()}
          >
            <MapContainer center={position} zoom={17} className={styles.bigMap}>
              <FixMapResize position={position} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              <Marker
                position={position}
                icon={getIconByType(task.task_type)}
              />

              {task.gpx_file && <GPXLayer fileName={task.gpx_file} />}
            </MapContainer>
          </div>
        </div>
      )}

      {/* ================= מודאל תמונה גדולה ================= */}
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
              src={`${API_BASE}/${task.image}`}
              className={styles.bigImage}
              alt="גדול"
            />
          </div>
        </div>
      )}

      {/* ================= מודאל פרטי עובד ================= */}
      {showUserModal && selectedUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>פרטי עובד</h2>

            <p>
              <strong>שם:</strong> {selectedUser.full_name}
            </p>

            <p>
              <strong>טלפון:</strong>{" "}
              {selectedUser.phone ? (
                <>
                  <a href={`tel:${selectedUser.phone}`}>
                    <FaPhone className={styles.phoneIcon} />
                  </a>{" "}
                  {selectedUser.phone}
                  <a
                    href={`https://wa.me/${formatPhone(selectedUser.phone)}`}
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
              {selectedUser.email ? (
                <>
                  <a href={`mailto:${selectedUser.email}`}>
                    <FaEnvelope className={styles.emailIcon} />
                  </a>{" "}
                  {selectedUser.email}
                </>
              ) : (
                "לא קיים"
              )}
            </p>

            <button
              className={styles.closeBtn}
              onClick={() => setShowUserModal(false)}
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================
// טעינת GPX למפה
// =============================================
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
//=========================
// ממקד את המפה על נקודה
//=========================
function AutoCenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;

    map.setView(position, 17); // זום + מיקום
  }, [position, map]);

  return null;
}
//=========================================
// מרענן את המפה אחרי פתיחה (חובה במודאלים)
//==================================
function FixMapResize({ position }) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize(); // מתקן גודל
      if (position) {
        map.setView(position, 17);
      }
    }, 150);
  }, [map, position]);

  return null;
}