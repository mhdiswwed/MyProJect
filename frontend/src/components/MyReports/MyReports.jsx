/**===================================================================
MyReports
קומפוננטה שמציגה את הדיווחים של המשתמש, מאפשרת צפייה בתמונה וביטול דיווח אם הוא חדש
 =====================================================================*/

import { useEffect, useState } from "react";
import styles from "./myReports.module.css";
import API_BASE from "../../config/api";

export default function MyReports({ user }) {
  /* מערך הדיווחים */
  const [reports, setReports] = useState([]);

  /* חלון אישור ביטול */
  const [showCancelModal, setShowCancelModal] = useState(false);

  /* מזהה הדיווח שנבחר */
  const [selectedReport, setSelectedReport] = useState(null);

  /* חלון תצוגת תמונה */
  const [showImageModal, setShowImageModal] = useState(false);

  /* כתובת התמונה שנבחרה */
  const [selectedImage, setSelectedImage] = useState(null);

  /**
   * שליפת הדיווחים מהשרת כאשר המשתמש נטען
   */
  useEffect(() => {
    if (!user) return;

    async function loadReports() {
      try {
        const res = await fetch(`${API_BASE}/api/myReports/${user.user_id}`);

        const data = await res.json();

        /* בדיקה שהשרת החזיר מערך */
        if (Array.isArray(data)) {
          setReports(data);
        } else {
          setReports([]);
        }
      } catch (err) {
        console.error("שגיאה בטעינת הדיווחים:", err);
      }
    }

    loadReports();
  }, [user]);

  /**
   * קביעת צבע הסטטוס לפי מצב הדיווח
   */
  function statusClass(status) {
    if (status === "חדש") return styles.new;

    if (status === "בטיפול") return styles.processing;

    if (status === "טופל") return styles.done;

    return "";
  }

  /**
   * פתיחת חלון אישור ביטול
   */
  function openCancelModal(reportId) {
    setSelectedReport(reportId);

    setShowCancelModal(true);
  }

  /**
   * ביטול הדיווח לאחר אישור
   */
  async function confirmCancel() {
    try {
      const res = await fetch(
        `${API_BASE}/api/myReports/cancelReport/${selectedReport}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json();

      /* אם המחיקה הצליחה */
      if (data.message) {
        /* הסרת הדיווח מהרשימה המקומית */
        setReports((prev) =>
          prev.filter((r) => r.report_id !== selectedReport),
        );

        setShowCancelModal(false);

        setSelectedReport(null);
      }
    } catch (err) {
      console.error("שגיאה בביטול הדיווח:", err);
    }
  }

  /**
   * פתיחת תצוגת תמונה גדולה
   */
  function openImage(imageUrl) {
    setSelectedImage(imageUrl);

    setShowImageModal(true);
  }

  /**
   * סגירת חלון התמונה
   */
  function closeImageModal() {
    setShowImageModal(false);

    setSelectedImage(null);
  }

  /* אם המשתמש עדיין לא נטען */
  if (!user) {
    return <div className={styles.page}>טוען משתמש...</div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>הדיווחים שלי</h1>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>סוג הבעיה</th>

            <th>תיאור</th>

            <th>תמונה</th>

            <th>זמן דיווח</th>

            <th>סטטוס</th>

            <th>פעולה</th>
          </tr>
        </thead>

        <tbody>
          {/* אם אין דיווחים */}

          {reports.length === 0 ? (
            <tr>
              <td colSpan="6">אין דיווחים להצגה</td>
            </tr>
          ) : (
            reports.map((rep) => (
              <tr key={rep.report_id}>
                <td>{rep.problem_type}</td>

                <td>{rep.description}</td>

                {/* תמונת הדיווח */}

                <td>
                  {rep.image_path && (
                    <img
                      src={`${API_BASE}/${rep.image_path}`}
                      alt="report"
                      loading="lazy"
                      className={styles.reportImage}
                      onClick={() => openImage(`${API_BASE}/${rep.image_path}`)}
                    />
                  )}
                </td>

                {/* זמן הדיווח */}

                <td>{new Date(rep.report_time).toLocaleString("he-IL")}</td>

                {/* סטטוס הדיווח */}

                <td>
                  <span
                    className={`${styles.status} ${statusClass(rep.status)}`}
                  >
                    {rep.status}
                  </span>
                </td>

                {/* כפתור ביטול */}

                <td>
                  {rep.status === "חדש" && (
                    <button
                      className={styles.cancelBtn}
                      onClick={() => openCancelModal(rep.report_id)}
                    >
                      בטל דיווח
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* חלון אישור ביטול */}

      {showCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>ביטול דיווח</h3>

            <p>האם אתה בטוח שברצונך לבטל את הדיווח?</p>

            <div className={styles.modalButtons}>
              <button className={styles.confirmBtn} onClick={confirmCancel}>
                כן, בטל
              </button>

              <button
                className={styles.closeBtn}
                onClick={() => setShowCancelModal(false)}
              >
                חזור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* חלון תצוגת תמונה גדולה */}

      {showImageModal && (
        <div className={styles.modalOverlay} onClick={closeImageModal}>
          <img src={selectedImage} alt="large" className={styles.largeImage} />
        </div>
      )}
    </div>
  );
}
