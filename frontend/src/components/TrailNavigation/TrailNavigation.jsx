/**========================================
 * TrailNavigation.jsx
 * ניווט שטח בזמן אמת + דיווח בעיה
 ==========================================*/

import { FaArrowRight } from "react-icons/fa";
import styles from "./trailNavigation.module.css";
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-gpx";
import API_BASE from "../../config/api";
// ייבוא פונקציית format מספריית date-fns לעבודה תקינה עם תאריך ושעה
import { format } from "date-fns";
import { renderToStaticMarkup } from "react-dom/server";
import { MdNavigation } from "react-icons/md";
import { FaFlagCheckered, FaPlayCircle } from "react-icons/fa";
import { FaMapMarkerAlt } from "react-icons/fa";
import { PiCheckerboardBold } from "react-icons/pi";
import Select from "react-select";
// ================= ICONS =================
// יוצר אייקון משתמש שמסתובב לפי כיוון התנועה
const createUserIcon = (heading) =>
  L.divIcon({
    html: `
      <div class="${styles.userMarker}">
        <div
          class="${styles.userMarkerInner}"
          style="transform: rotate(${heading}deg);"
        >
          ➤
        </div>
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const startIcon = L.divIcon({
  html: `
    <div style="
      width: 22px;
      height: 22px;
      background: #2ecc71;
      border: 4px solid white;
      border-radius: 50%;
      box-shadow: 0 0 10px #2ecc71;
    "></div>
  `,
  className: "custom-div-icon",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const finishIcon = L.divIcon({
  html: `
    <div class="${styles.finishPin}">
      <div class="${styles.finishCircle}">
        🏁
      </div>
    </div>
  `,
  className: "custom-div-icon",
  iconSize: [44, 44],
  iconAnchor: [22, 44],
});

export default function TrailNavigation({ user }) {
  const { id } = useParams(); // זה trail_id
  const [searchParams] = useSearchParams();
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
  // מביא מהשרת את מזהה הקבוצה הפעילה של המשתמש במסלול ושומר אותו ב-state
  const [groupId, setGroupId] = useState(null);
  // שומר את כיוון התנועה (מצפן) של המשתמש
  const [heading, setHeading] = useState(0);
  // שומר את נקודות המסלול מה־GPX
  const [gpxPoints, setGpxPoints] = useState([]);

  // שומר את הנקודה האחרונה במסלול כדי לא לחזור אחורה
  const [routeIndex, setRouteIndex] = useState(0);

  // שומר את המיקום המוצמד למסלול
  const [snappedPosition, setSnappedPosition] = useState(null);

  //=====================================
  //שולף מהשרת את מזהה הקבוצה הפעילה של המשתמש במסלול ושומר אותו ב-state
  //====================================
  useEffect(() => {
    if (!user) return;

    fetch(`${API_BASE}/api/trailNavigation/active-group/${id}/${user.user_id}`)
      .then((res) => res.json())
      .then((data) => setGroupId(data.groupId))
      .catch(() => setGroupId(null));
  }, [id, user]);

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
        // שומר את המיקום הנוכחי
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        // מעדכן כיוון רק כשהמשתמש באמת בתנועה כדי למנוע סיבובים אקראיים
        // מחשב כיוון קדימה לפי המסלול ולא לפי מצפן הטלפון
        if (gpxPoints.length > 1) {
          const current = [pos.coords.latitude, pos.coords.longitude];

          let nearestIndex = routeIndex;

          for (let i = routeIndex; i < gpxPoints.length; i++) {
            if (
              distance(current, gpxPoints[i]) <
              distance(current, gpxPoints[nearestIndex])
            ) {
              nearestIndex = i;
            }
          }

          const nextIndex = Math.min(nearestIndex + 3, gpxPoints.length - 1);

          setRouteIndex(nearestIndex);
          setHeading(bearing(gpxPoints[nearestIndex], gpxPoints[nextIndex]));
          // מצמיד את הסמן לנקודה הקרובה במסלול כמו ב־Waze
          setSnappedPosition(gpxPoints[nearestIndex]);
        }
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
  }, [gpxPoints, routeIndex]);

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
    /*formData.append("latitude", 32.96506);//מיקום נכון מקובץ GPX 
    formData.append("longitude", 35.382479);*/
    formData.append("problem_type", problemType);
    formData.append("description", description);
    formData.append("image", image); // חובה

    try {
      if (!groupId) {
        setReportMsg({
          type: "error",
          text: "שגיאה: לא ניתן לדווח - הקבוצה אינה פעילה כרגע בשטח , הדיווח זמין רק בזמן טיול פעיל",
        });
        return;
      }
      const res = await fetch(
        `${API_BASE}/api/trailNavigation/${groupId}/report`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );

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

        {/* טוען את קובץ ה־GPX ושומר את נקודות המסלול */}
        {trail.gpx_file && (
          <GPXLayer fileName={trail.gpx_file} setGpxPoints={setGpxPoints} />
        )}

        {position && (
          <>
            {/* מציג את המשתמש על המסלול ולא על מיקום ה־GPS הגולמי */}
            <Marker
              position={snappedPosition || position}
              icon={createUserIcon(heading)}
            />

            <AutoCenter position={snappedPosition || position} />
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
              <Select
                value={
                  problemType
                    ? { value: problemType, label: problemType }
                    : null
                }
                onChange={(selected) =>
                  setProblemType(selected ? selected.value : "")
                }
                className={styles.guideSelectCustom}
                classNamePrefix="react-select"
                menuPlacement="top"
                options={[
                  { value: "סכנה", label: "סכנה" },
                  { value: "חסימה", label: "חסימה" },
                  { value: "תחזוקה", label: "תחזוקה" },
                  { value: "ניקיון", label: "ניקיון" },
                ]}
                placeholder="בחר סוג בעיה"
              />

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
function GPXLayer({ fileName, setGpxPoints }) {
  const map = useMap();

  useEffect(() => {
    const gpx = new L.GPX(`${API_BASE}/uploads/gpx/${fileName}`, {
      async: true,
    });

    gpx.on("loaded", async () => {
      // מתאים מסך
      map.fitBounds(gpx.getBounds());

      // קורא קובץ GPX ידנית
      const response = await fetch(`${API_BASE}/uploads/gpx/${fileName}`);

      const text = await response.text();

      const parser = new DOMParser();

      const xml = parser.parseFromString(text, "application/xml");

      // כל נקודות המסלול
      const points = xml.getElementsByTagName("trkpt");
      // שומר את נקודות ה־GPX כדי לחשב כיוון קדימה לפי המסלול
      const parsedPoints = Array.from(points).map((p) => [
        parseFloat(p.getAttribute("lat")),
        parseFloat(p.getAttribute("lon")),
      ]);

      setGpxPoints(parsedPoints);

      if (!points.length) return;

      // התחלה
      const startLat = parseFloat(points[0].getAttribute("lat"));

      const startLng = parseFloat(points[0].getAttribute("lon"));

      // סיום
      const last = points[points.length - 1];

      const endLat = parseFloat(last.getAttribute("lat"));

      const endLng = parseFloat(last.getAttribute("lon"));

      // marker התחלה
      L.marker([startLat, startLng], {
        icon: startIcon,
      }).addTo(map);

      // marker סיום
      L.marker([endLat, endLng], {
        icon: finishIcon,
      }).addTo(map);
    });

    gpx.addTo(map);

    return () => {
      map.removeLayer(gpx);
    };
  }, [fileName, map, setGpxPoints]);

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
