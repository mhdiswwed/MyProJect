/**
 * MyRequests.jsx
 * ------------------------------------------------
 * קומפוננטה להצגת הבקשות של המשתמש
 *
 * הקומפוננטה מבצעת:
 * - שליפת הבקשות מהשרת
 * - הצגת הבקשות בטבלה
 * - שליחת בקשת ביטול עם סיבה
 * - הצגת שני סטטוסים במידת הצורך
 */

import { useEffect, useState } from "react";
import styles from "./myRequests.module.css";
import API_BASE from "../../config/api";
/* אייקונים להצגת פעולות */
import {
  FaEye,
  FaDownload,
  FaExchangeAlt,
  FaBell,
  FaMapMarkerAlt,
} from "react-icons/fa";
// אייקונים להתראות, מיקום וזמן
import { MdAccessTime } from "react-icons/md";


export default function MyRequests({ user }) {
  /* מערך הבקשות של המשתמש */
  const [requests, setRequests] = useState([]);

  /* שליטה על פתיחת חלון הביטול */
  const [showCancelModal, setShowCancelModal] = useState(false);

  /* סיבת הביטול */
  const [cancelReason, setCancelReason] = useState("");

  /* הבקשה שנבחרה לביטול */
  const [selectedRequest, setSelectedRequest] = useState(null);

  /* הודעת שגיאה */
  const [error, setError] = useState("");

  /* שליטה על פתיחת חלון פרטים */
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  /* הבקשה שנבחרה להצגת פרטים */
  const [selectedDetails, setSelectedDetails] = useState(null);

  /* פרטי הקבוצה שנשלפים מהשרת כאשר הבקשה מאושרת */
  const [groupDetails, setGroupDetails] = useState(null);

  /* טעינה בזמן שליפת פרטי קבוצה */
  const [groupLoading, setGroupLoading] = useState(false);

  /* =========================
   סינון לפי סטטוס
========================= */
  const [filter, setFilter] = useState("all");

  // שומר את ה-ID של הבקשה שעליה נלחץ כדי להדגיש אותה בטבלה
  const [highlightedId, setHighlightedId] = useState(null);

  /**
   * שליפת פרטי קבוצה מהשרת לפי מזהה הבקשה
   * השרת אמור להחזיר נתונים מטבלת groups
   */
  function fetchGroupDetails(requestId) {
    setGroupLoading(true);

    fetch(`${API_BASE}/api/myRequests/byRequest/${requestId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data) {
          setGroupDetails(null);
        } else {
          setGroupDetails(data);
        }

        setGroupLoading(false);
      })
      .catch((err) => {
        console.error("שגיאה בשליפת פרטי קבוצה:", err);

        setGroupLoading(false);
      });
  }

  /**
   * ------------------------------------------------
   * צפייה בחשבונית
   * פותח את קובץ ה-PDF בלשונית חדשה
   * ------------------------------------------------
   */
  function viewInvoice(fileName) {
    const url = `${API_BASE}/uploads/invoices/${fileName}`;

    const link = document.createElement("a");

    link.href = url;
    link.target = "_blank";

    link.rel = "noopener noreferrer";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * ------------------------------------------------
   * הורדת חשבונית
   * מוריד את קובץ ה-PDF למחשב
   * ------------------------------------------------
   */
  function downloadInvoice(fileName) {
    const url = `${API_BASE}/uploads/invoices/${fileName}`;

    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const fileURL = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = fileURL;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        link.remove();

        window.URL.revokeObjectURL(fileURL);
      });
  }

  /**
   * שליפת הבקשות מהשרת
   */
  useEffect(() => {
    if (!user) return;

    fetch(`${API_BASE}/api/myRequests/${user.user_id}`)
      .then((res) => res.json())
      .then((data) => {
        /* הגנה אם השרת לא מחזיר מערך */

        if (!Array.isArray(data)) {
          console.error("השרת לא החזיר מערך:", data);
          setRequests([]);
          return;
        }

        setRequests(data);
      })
      .catch((err) => {
        console.error("שגיאה בשליפת הבקשות:", err);
        setRequests([]);
      });
  }, [user]);

  /**
   * מחזיר מחלקת CSS לפי סטטוס
   */
  function getStatusClass(status) {
    if (status === "מאושר") return styles.approved;

    if (status === "ממתין") return styles.pending;

    if (status === "נדחה") return styles.rejected;

    if (status === "מבוטל") return styles.cancelled;

    if (status === "מבקש ביטול") return styles.cancelReq;

    return "";
  }

  /**
   * פתיחת חלון בקשת ביטול
   */
  function openCancelModal(id) {
    setSelectedRequest(id);

    setCancelReason("");

    setError("");

    setShowCancelModal(true);
  }

  /**
   * שליחת בקשת ביטול
   */
  function sendCancelRequest() {
    if (!cancelReason.trim()) {
      setError("יש לכתוב סיבה לביטול");

      return;
    }

    fetch(`${API_BASE}/api/myRequests/cancelRequest/${selectedRequest}`, {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        reason: cancelReason,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        /* עדכון מקומי של הבקשה */

        setRequests((prev) =>
          prev.map((r) =>
            r.request_id === selectedRequest
              ? { ...r, cancel_requested: 1 }
              : r,
          ),
        );

        setShowCancelModal(false);
      })
      .catch((err) => {
        console.error("שגיאה בשליחת בקשת ביטול:", err);
      });
  }

  /**
   * אם המשתמש עדיין לא נטען
   */
  if (!user) {
    return <div className={styles.page}>טוען משתמש...</div>;
  }

  /**=======================================
   * פתיחת חלון פרטים
   * אם הבקשה מאושרת - שולפים פרטי קבוצה מהשרת
   ========================================*/
  function openDetailsModal(request) {
    setSelectedDetails(request);

    /* ניקוי נתונים קודמים */
    setGroupDetails(null);

    if (request.status === "מאושר") {
      fetchGroupDetails(request.request_id);
    }

    setShowDetailsModal(true);
  }

  /* =========================
   סינון בקשות לפי סטטוס
========================= */
  const filteredRequests = requests.filter((r) => {
    /* אם נבחר "הכל" → מחזיר הכל */
    if (filter === "all") return true;

    /* ממתין */
    if (filter === "pending") return r.status === "ממתין";

    /* מאושר */
    if (filter === "approved") return r.status === "מאושר";

    /* נדחה */
    if (filter === "rejected") return r.status === "נדחה";

    /* מבוטל */
    if (filter === "cancelled") return r.status === "מבוטל";

    /* מבקש ביטול */
    if (filter === "cancelRequest") return r.cancel_requested === 1;

    return true;
  });

  
  //==============================================================
  // מסנן את כל הבקשות ומחזיר רק מסלולים מאושרים שמתקיימים מחר או מחרתיים
  //========================================================
  const upcomingTrips = requests.filter((r) => {
    if (r.status !== "מאושר") return false;

    const tripDate = new Date(r.trip_date);
    const today = new Date();

    const diff = Math.ceil((tripDate - today) / (1000 * 60 * 60 * 24));

    return diff === 1 || diff === 2; // מחר או מחרתיים
  });
  //==============================================
  // מחזיר טקסט מתאים לפי ההפרש בין התאריך להיום
  //===========================================
  function getTripLabel(date) {
    const tripDate = new Date(date);
    const today = new Date();

    const diff = Math.ceil((tripDate - today) / (1000 * 60 * 60 * 24));

    if (diff === 1) return "מחר";
    if (diff === 2) return "מחרתיים";

    return "";
  }
//==========================================
  // כאשר לוחצים על התראה → מדגיש שורה + גולל אליה
  //=====================================
  function handleAlertClick(trip) {
    setHighlightedId(trip.request_id);

    const row = document.getElementById(`row-${trip.request_id}`);

    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // ביטול הדגשה אחרי 4 שניות
    setTimeout(() => {
      setHighlightedId(null);
    }, 7000);
  }




  return (
    <div className={styles.page}>
      {/* =====================================================
שורת כותרת + סינון
===================================================== */}
      <div className={styles.topBarRow}>
        {/* כותרת העמוד */}
        <h1 className={styles.title}>הבקשות שלי</h1>

        {/* קופסת התראות למסלולים קרובים */}
        {upcomingTrips.length > 0 && (
          <div className={styles.alertBox}>
            {/* כותרת ההתראה */}
            <div className={styles.alertTitle}>
              <FaBell /> יש לך {upcomingTrips.length} מסלולים קרובים
            </div>

            {/* רשימת מסלולים (מוגבל ל-3 כדי לא להעמיס) */}
            {upcomingTrips.slice(0, 3).map((trip) => (
              <div
                key={trip.request_id}
                className={styles.alertItem}
                onClick={() => handleAlertClick(trip)}
              >
                <FaMapMarkerAlt /> {getTripLabel(trip.trip_date)} –{" "}
                {trip.trail_name} <MdAccessTime /> {trip.trip_time?.slice(0, 5)}
              </div>
            ))}
          </div>
        )}
        <div className={styles.filterRow}>
          {/* קופסת סינון */}
          <div className={styles.filterBox}>
            {/* תווית */}
            <span className={styles.filterLabel}>סינון:</span>

            {/* בחירת סטטוס */}
            <select
              className={styles.filterSelect}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">כל הבקשות</option>
              <option value="pending">ממתין</option>
              <option value="cancelRequest">מבקש ביטול</option>
              <option value="approved">מאושר</option>
              <option value="rejected">נדחה</option>
              <option value="cancelled">מבוטל</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>מסלול</th>
              <th>תאריך</th>
              <th>שעה</th>
              <th>מספר משתתפים</th>
              <th>שם המדריך</th>
              <th>כלים</th>
              <th>מחיר כלי ליחיד</th>
              <th>מחיר השתתפות ליחיד</th>
              <th>מחיר לפני מע״מ</th>
              <th>מע״מ</th>
              <th>מחיר כולל מע״מ</th>
              <th>סטטוס</th>
              <th>פעולה</th>
              <th>פרטים</th>
            </tr>
          </thead>

          <tbody>
            {/* מציג את הבקשות אחרי סינון */}
            {Array.isArray(filteredRequests) &&
              filteredRequests.map((r) => (
                // כל שורה מקבלת ID + הדגשה אם נבחרה
                <tr
                  key={r.request_id}
                  id={`row-${r.request_id}`}
                  className={
                    highlightedId === r.request_id ? styles.highlightRow : ""
                  }
                >
                  <td>{r.trail_name}</td>

                  <td>
                    <div>
                      {r.trip_date
                        ? new Date(r.trip_date).toLocaleDateString()
                        : "—"}
                    </div>

                    {/* מציג תאריך חדש אם המנהל שינה */}
                    {r.changed_trip_date &&
                      r.changed_trip_date !== r.trip_date && (
                        <div className={styles.changedValue}>
                          <FaExchangeAlt className={styles.changeIcon} />
                          {new Date(r.changed_trip_date).toLocaleDateString()}
                        </div>
                      )}
                  </td>

                  <td>
                    <div>{r.trip_time?.slice(0, 5) || "—"}</div>

                    {/* מציג שעה חדשה אם המנהל שינה */}
                    {r.changed_trip_time &&
                      r.changed_trip_time !== r.trip_time && (
                        <div className={styles.changedValue}>
                          <FaExchangeAlt className={styles.changeIcon} />
                          {r.changed_trip_time?.slice(0, 5)}
                        </div>
                      )}
                  </td>

                  <td>{r.number_of_participants}</td>

                  <td>
                    <div>{r.guide_name || "—"}</div>

                    {/* מציג מדריך חדש אם המנהל החליף */}
                    {r.changed_guide_name &&
                      r.changed_guide_name !== r.guide_name && (
                        <div className={styles.changedValue}>
                          <FaExchangeAlt className={styles.changeIcon} />
                          {r.changed_guide_name}
                        </div>
                      )}
                  </td>

                  <td>{r.number_of_vehicles}</td>

                  <td>
                    {r.price_per_vehicle ? `₪${r.price_per_vehicle}` : "—"}
                  </td>

                  <td>₪{Number(r.price_per_person || 0).toFixed(2)}</td>

                  <td>₪{Number(r.total_before_vat || 0).toFixed(2)}</td>

                  <td>₪{Number(r.vat_amount || 0).toFixed(2)}</td>

                  <td>₪{Number(r.total_with_vat || 0).toFixed(2)}</td>

                  {/* סטטוס */}

                  <td>
                    <span
                      className={`${styles.status} ${getStatusClass(r.status)}`}
                    >
                      {r.status}
                    </span>

                    {/* אם המשתמש ביקש ביטול */}

                    {r.cancel_requested === 1 && r.status !== "מבקש ביטול" && (
                      <span className={`${styles.status} ${styles.cancelReq}`}>
                        מבקש ביטול
                      </span>
                    )}
                  </td>

                  {/* כפתור פעולה */}

                  <td>
                    {r.cancel_requested === 1 ? (
                      <span className={styles.pendingCancelText}>
                        בקשת הביטול נשלחה
                      </span>
                    ) : r.cancel_reject_reason ? (
                      <span className={styles.cancelRejectedText}>
                        בקשת הביטול נדחתה
                      </span>
                    ) : r.status === "ממתין" || r.status === "מאושר" ? (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => openCancelModal(r.request_id)}
                      >
                        בקש ביטול
                      </button>
                    ) : null}
                  </td>

                  <td>
                    <button
                      className={styles.detailsBtn}
                      onClick={() => openDetailsModal(r)}
                    >
                      פרטים
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------ */}
      {/* חלון פופ-אפ להצגת פרטים לפי סטטוס הבקשה */}
      {/* ------------------------------------------------ */}
      {showDetailsModal && selectedDetails && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* ------------------------------------------ */}
            {/* כותרת דינמית לפי סטטוס */}
            {/* ------------------------------------------ */}
            {selectedDetails.status === "מאושר" && <h3>פרטי הקבוצה החדשה</h3>}
            {selectedDetails.status === "נדחה" && <h3>הבקשה נדחתה</h3>}
            {selectedDetails.status === "ממתין" && <h3>הבקשה ממתינה לאישור</h3>}
            {selectedDetails.status === "מבוטל" && <h3>הבקשה בוטלה</h3>}
            {/* ------------------------------------------ */}
            {/* תוכן הפופאפ לפי סטטוס */}
            {/* ------------------------------------------ */}
            {/* הודעות בין המשתמש למנהל */}
            <div className={styles.messagesBox}>
              {/* הודעת המשתמש - בקשת ביטול */}
              {selectedDetails.cancel_reason && (
                <div className={styles.userMessage}>
                  <strong>הודעת המשתמש:</strong> {selectedDetails.cancel_reason}
                </div>
              )}

              {/* דחיית בקשה */}
              {selectedDetails.reject_reason && (
                <div className={styles.adminMessage}>
                  <strong>הודעת מנהל:</strong> {selectedDetails.reject_reason}
                </div>
              )}

              {/* דחיית ביטול */}
              {selectedDetails.cancel_reject_reason && (
                <div className={styles.adminMessage}>
                  <strong>המנהל דחה את הביטול:</strong>{" "}
                  {selectedDetails.cancel_reject_reason}
                </div>
              )}

              {/* תגובת מנהל */}
              {selectedDetails.cancel_admin_response && (
                <div className={styles.adminMessage}>
                  <strong>הודעת מנהל:</strong>{" "}
                  {selectedDetails.cancel_admin_response}
                </div>
              )}

              {/* סיבת שינוי טיול */}
              {selectedDetails.change_reason && (
                <div className={styles.adminMessage}>
                  <strong>המנהל שינה את פרטי הטיול:</strong>{" "}
                  {selectedDetails.change_reason}
                </div>
              )}

              {/* סיבת שינוי מדריך */}
              {selectedDetails.guide_change_reason && (
                <div className={styles.adminMessage}>
                  <strong>המנהל החליף מדריך:</strong>{" "}
                  {selectedDetails.guide_change_reason}
                </div>
              )}
            </div>

            {/*הודעה: המנהל ביטל קבוצה מאושרת*/}
            {selectedDetails.status === "מבוטל" &&
              selectedDetails.group_cancel_reason && (
                <div className={styles.adminMessageUrgent}>
                  <strong>המנהל ביטל את הקבוצה שהייתה מאושרת בגלל:</strong>{" "}
                  {selectedDetails.group_cancel_reason}
                </div>
              )}
            {/* אם הבקשה מאושרת מציגים פרטי קבוצה */}
            {selectedDetails.status === "מאושר" &&
              (groupLoading ? (
                <p>טוען פרטי קבוצה...</p>
              ) : groupDetails ? (
                <>
                  <h4>פרטי הקבוצה החדשה</h4>

                  <p>
                    <strong>תאריך יציאה:</strong>
                    {new Date(groupDetails.trip_date).toLocaleDateString()}
                  </p>

                  <p>
                    <strong>שעת יציאה:</strong>
                    {groupDetails.trip_time?.slice(0, 5)}
                  </p>

                  <p>
                    <strong>נקודת מפגש:</strong>
                    {groupDetails.meeting_point}
                  </p>

                  <p>
                    <strong>סטטוס קבוצה:</strong>
                    {groupDetails.status}
                  </p>

                  <h4>פרטי המדריך</h4>

                  <p>
                    <strong>שם מדריך:</strong> {groupDetails.guide_name}
                  </p>
                  <p>
                    <strong>טלפון:</strong> {groupDetails.guide_phone}
                  </p>
                  <p>
                    <strong>אימייל:</strong> {groupDetails.guide_email}
                  </p>

                  <div className={styles.invoiceRow}>
                    <h4>חשבונית</h4>

                    {groupDetails.invoice_file ? (
                      <div className={styles.invoiceIcons}>
                        <FaEye
                          className={styles.iconBtn}
                          title="צפייה בחשבונית"
                          onClick={() => viewInvoice(groupDetails.invoice_file)}
                        />

                        <FaDownload
                          className={styles.iconBtn}
                          title="הורדת חשבונית"
                          onClick={() =>
                            downloadInvoice(groupDetails.invoice_file)
                          }
                        />
                      </div>
                    ) : (
                      <p>החשבונית עדיין לא נוצרה.</p>
                    )}
                  </div>
                </>
              ) : (
                <p>לא נמצאו פרטי קבוצה.</p>
              ))}
            {/* מצב 2 - הבקשה נדחתה */}
            {selectedDetails.status === "נדחה" && (
              <>
                <p>
                  <strong>סיבת הדחייה:</strong>{" "}
                  {selectedDetails.reject_reason || "לא נמסרה סיבה"}
                </p>
              </>
            )}
            {/* מצב 3 - הבקשה ממתינה */}
            {selectedDetails.status === "ממתין" && (
              <>
                <p>הבקשה נשלחה והיא ממתינה לאישור המנהל.</p>
              </>
            )}
            {/* מצב 4 - הבקשה בוטלה */}
            {selectedDetails.status === "מבוטל" && (
              <>
                <p>
                  <strong>סיבת הביטול של:</strong>{" "}
                  {selectedDetails.cancel_reason || "לא נמסרה סיבה"}
                </p>
              </>
            )}
            {/* ------------------------------------------ */}
            {/* כפתור סגירה */}
            {/* ------------------------------------------ */}
            <div className={styles.modalButtons}>
              <button
                className={styles.closeBtn}
                onClick={() => setShowDetailsModal(false)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* חלון פופ-אפ לביטול */}

      {showCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>בקשת ביטול</h3>

            <textarea
              placeholder="כתוב סיבה לביטול הבקשה..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />

            {error && <span className={styles.error}>{error}</span>}

            <div className={styles.modalButtons}>
              <button className={styles.confirmBtn} onClick={sendCancelRequest}>
                שלח בקשה
              </button>

              <button
                className={styles.closeBtn}
                onClick={() => setShowCancelModal(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
