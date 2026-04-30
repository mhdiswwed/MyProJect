/*==========================================
ServerStatus
קומפוננטה להצגת מצב השרת (פעיל/לא זמין) בסרגל הצד של המנהל, כולל בדיקה אוטומטית כל כמה שניות ועדכון בזמן אמת
========================================== */

import { useEffect, useState } from "react";
import styles from "./serverStatus.module.css"; // ייבוא המודול
import API_BASE from "../../config/api";
export default function ServerStatus() {
  // מצב השרת
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };

    checkServer();

    const interval = setInterval(checkServer, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.status}>
      {/* נקודה */}
      <div
        className={styles.dot}
        style={{ background: isOnline ? "#22c55e" : "#ef4444" }}
      ></div>

      {/* טקסט */}
      <span>
        {isOnline === null
          ? "בודק חיבור..."
          : isOnline
            ? "מערכת פעילה"
            : "מערכת לא זמינה"}
      </span>
    </div>
  );
}
