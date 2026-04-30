/**====================================================================
TrailMap
קומפוננטה להצגת מסלול על מפה, טוענת קובץ עקיבה מהשרת ומציירת אותו עם זום אוטומטי לפי המסלול
 ======================================================================*/
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

// קומפוננטה פנימית שמטפלת בהוספת המסלול למפה
function TrackLayer({ fileName }) {
  // קבלת אובייקט המפה הקיים
  const map = useMap();

  useEffect(() => {
    // אם אין קובץ – לא עושים כלום
    if (!fileName) return;

    // יצירת שכבת מסלול מקובץ המעקב
    const track = new L.GPX(`${API_BASE}/uploads/gpx/${fileName}`, {
      async: true,
      marker_options: {
        startIconUrl: null,
        endIconUrl: null,
        shadowUrl: null,
      },
    }).on("loaded", (e) => {
      // התאמת הזום למסלול
      map.fitBounds(e.target.getBounds());
    });

    // הוספת המסלול למפה
    track.addTo(map);

    // ניקוי בעת יציאה מהקומפוננטה
    return () => {
      map.removeLayer(track);
    };
  }, [fileName, map]);

  return null;
}

// קומפוננטה ראשית להצגת מפה עם מסלול
export default function TrailMap({ fileName }) {
  return (
    <MapContainer
      style={{ height: "400px", width: "100%" }}
      center={[32.95, 35.35]}
      zoom={13}
    >
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