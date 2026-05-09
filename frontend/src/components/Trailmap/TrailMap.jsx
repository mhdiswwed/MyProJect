/**====================================================================
TrailMap
קומפוננטה להצגת מסלול על מפה, טוענת קובץ עקיבה מהשרת ומציירת אותו עם זום אוטומטי לפי המסלול
 ======================================================================*/
import styles from "./trailMap.module.css";
// ייבוא useEffect לניהול חיי הקומפוננטה
import { useEffect } from "react";

// ייבוא רכיבי מפה מ־react-leaflet
import { MapContainer, TileLayer, useMap } from "react-leaflet";

// ייבוא leaflet עצמו
import L from "leaflet";

// ייבוא עיצוב של leaflet
import "leaflet/dist/leaflet.css";

// ייבוא תוסף להצגת קובץ מעקב
import "leaflet-gpx";

import API_BASE from "../../config/api";
// ================= START ICON =================
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

// ================= FINISH ICON =================
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
// קומפוננטה פנימית שמטפלת בהוספת המסלול למפה
function TrackLayer({ fileName }) {
  // קבלת אובייקט המפה הקיים
  const map = useMap();

 useEffect(() => {
   if (!fileName) return;

   const track = new L.GPX(`${API_BASE}/uploads/gpx/${fileName}`, {
     async: true,
     marker_options: {
       startIconUrl: null,
       endIconUrl: null,
       shadowUrl: null,
     },
   });

   track.on("loaded", async () => {
     map.fitBounds(track.getBounds());

     // קריאת קובץ GPX
     const response = await fetch(`${API_BASE}/uploads/gpx/${fileName}`);

     const text = await response.text();

     const parser = new DOMParser();

     const xml = parser.parseFromString(text, "application/xml");

     // כל נקודות המסלול
     const points = xml.getElementsByTagName("trkpt");

     if (!points.length) return;

     // התחלה
     const startLat = parseFloat(points[0].getAttribute("lat"));
     const startLng = parseFloat(points[0].getAttribute("lon"));

     // סיום
     const last = points[points.length - 1];

     const endLat = parseFloat(last.getAttribute("lat"));
     const endLng = parseFloat(last.getAttribute("lon"));

     // אייקון התחלה
     L.marker([startLat, startLng], {
       icon: startIcon,
     }).addTo(map);

     // אייקון סיום
     L.marker([endLat, endLng], {
       icon: finishIcon,
     }).addTo(map);
   });

   track.addTo(map);

   return () => {
     map.removeLayer(track);
   };
 }, [fileName, map]);

  return null;
}

// קומפוננטה ראשית להצגת מפה עם מסלול
export default function TrailMap({ fileName }) {
  return (
    <MapContainer className={styles.trailMap} center={[32.95, 35.35]} zoom={13}>
      {/* שכבת המפה */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        lang="he"
      />

      {/* שכבת המסלול */}
      <TrackLayer fileName={fileName} />
    </MapContainer>
  );
}