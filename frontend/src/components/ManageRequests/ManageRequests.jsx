/**
------------------------------------------------
קומפוננטת ניהול בקשות טיול למנהל
------------------------------------------------

תכונות:
- הצגת כל בקשות הטיול
- סינון בקשות לפי סטטוס
- אישור בקשה
- דחיית בקשה עם סיבה
- אישור ביטול בקשה
- בדיקה אם נעשה שינוי בבקשה
- חובה לכתוב סיבה אם נעשה שינוי
- הצגת הודעת הצלחה / שגיאה בתוך הדף
*/

import { useEffect, useState } from "react";
import styles from "./manageRequests.module.css";
import API_BASE from "../../config/api";
// אייקונים להצגת שינוי ואייקון עין להצגת הודעות
import {
  FaExchangeAlt,
  FaEye,
  FaPhone,
  FaEnvelope,
  FaWhatsapp,
  FaUser,
  FaCar,
} from "react-icons/fa";



export default function ManageRequests() {
  /* =========================
     רשימת כל הבקשות
  ========================= */
  const [requests, setRequests] = useState([]);

  /* =========================
     רשימת מדריכים
  ========================= */
  const [guides, setGuides] = useState([]);

  /* =========================
     מודאל דחיית בקשה
  ========================= */
  const [showRejectModal, setShowRejectModal] = useState(false);

  /* =========================
     מודאל אישור בקשה
  ========================= */
  const [showApproveModal, setShowApproveModal] = useState(false);

  /* =========================
     הבקשה שנבחרה
  ========================= */
  const [selectedRequest, setSelectedRequest] = useState(null);

  /* =========================
     סיבת דחייה
  ========================= */
  const [reason, setReason] = useState("");

  /* =========================
     הודעת מערכת למשתמש
  ========================= */
  const [msg, setMsg] = useState({ type: "", text: "" });

  /* =========================
     פילטר סטטוסים
  ========================= */
  const [filter, setFilter] = useState("all");

  // פעולה שמחכה לאישור המשתמש
  const [confirmAction, setConfirmAction] = useState(null);

  /* מצב החלפת מדריך */
  const [changeGuide, setChangeGuide] = useState(false);

  /* מצב שינוי תאריך ושעה */
  const [changeDateTime, setChangeDateTime] = useState(false);

  /* =========================
   מודאל להצגת הודעות
========================= */

  // האם להציג את חלון ההודעות
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  // רשימת ההודעות של הבקשה
  const [messages, setMessages] = useState([]);

  /* מצב האם אנחנו בדחיית ביטול */
  const [isRejectCancelMode, setIsRejectCancelMode] = useState(false);

  // סיבה להחלפת מדריך בלבד
  const [guideChangeReason, setGuideChangeReason] = useState("");

  /* =========================
     נתונים לאישור בקשה
  ========================= */
  const [approveData, setApproveData] = useState({
    trip_date: "",
    trip_time: "",
    meeting_point: "",
    guide_id: "",
    change_reason: "",
  });

  /* =========================
   פרטי לקוח (פופאפ)
========================= */

  // לקוח שנבחר
  const [selectedUser, setSelectedUser] = useState(null);

  // האם להציג מודאל
  const [showUserModal, setShowUserModal] = useState(false);

  /**
   * =========================================
   * פתיחת חלון פרטי לקוח
   * =========================================
   */
  function openUserDetails(req) {
    setSelectedUser(req); // שומר את הבקשה (כוללת פרטי משתמש)
    setShowUserModal(true); // פותח מודאל
  }

  /**
   * =========================================
   * המרת מספר ל-WhatsApp
   * =========================================
   */
  function formatPhoneForWhatsapp(phone) {
    if (!phone) return "";

    let clean = phone.replace(/\D/g, "");

    // המרה מ-0 ל-972
    if (clean.startsWith("0")) {
      return "972" + clean.substring(1);
    }

    return clean;
  }

  /* =====================================================
   פתיחת חלון ההודעות של הבקשה
   מציג את כל ההודעות בין המשתמש למנהל
===================================================== */
  function openMessages(request) {
    // מערך הודעות
    const msgs = [];

    /* =====================================
     הודעות של המשתמש
  ===================================== */

    // אם המשתמש ביקש ביטול
    if (request.cancel_reason) {
      msgs.push({
        sender: "משתמש",
        text: "בקשת ביטול: " + request.cancel_reason,
      });
    }

    /* =====================================
     הודעות של המנהל
  ===================================== */

    // אם הבקשה נדחתה
    if (request.reject_reason) {
      msgs.push({
        sender: "מנהל",
        text: "סיבת דחייה: " + request.reject_reason,
      });
    }

    // אם המנהל דחה ביטול
    if (request.cancel_reject_reason) {
      msgs.push({
        sender: "מנהל",
        text: "דחיית בקשת ביטול: " + request.cancel_reject_reason,
      });
    }

    // אם המנהל שינה תאריך
    if (
      request.changed_trip_date &&
      request.changed_trip_date !== request.trip_date
    ) {
      msgs.push({
        sender: "מנהל",
        text:
          "שינוי תאריך טיול ל: " +
          new Date(request.changed_trip_date).toLocaleDateString("he-IL"),
      });
    }

    // אם המנהל שינה שעה
    if (
      request.changed_trip_time &&
      request.changed_trip_time !== request.trip_time
    ) {
      msgs.push({
        sender: "מנהל",
        text: "שינוי שעת טיול ל: " + request.changed_trip_time,
      });
    }

    // אם המנהל שינה מדריך
    if (
      request.changed_guide_name &&
      request.changed_guide_name !== request.guide_name
    ) {
      msgs.push({
        sender: "מנהל",
        text: "המדריך הוחלף ל: " + request.changed_guide_name,
      });
    }

    // אם המנהל כתב סיבה לשינוי
    if (request.change_reason) {
      msgs.push({
        sender: "מנהל",
        text: "סיבת שינוי: " + request.change_reason,
      });
    }

    /* =====================================
     שמירת ההודעות ופתיחת החלון
  ===================================== */

    setMessages(msgs);
    setShowMessagesModal(true);
  }

  /* =====================================================
     טעינת נתונים בעת פתיחת הדף
  ===================================================== */
  useEffect(() => {
    loadRequests();
  }, []);

  /* =====================================================
     ניקוי הודעת מערכת אחרי 3 שניות
  ===================================================== */
  useEffect(() => {
    if (!msg.text) return;

    const timer = setTimeout(() => {
      setMsg({ type: "", text: "" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [msg]);

  /* =====================================================
   סגירת מודאלים אוטומטית לאחר הודעת הצלחה
   נותן למשתמש זמן לראות את ההודעה לפני סגירה
===================================================== */
  useEffect(() => {
    // בודק אם סוג ההודעה הוא הצלחה
    if (msg.type === "success") {
      // מפעיל טיימר של 1.5 שניות לפני סגירת המודאל
      const timer = setTimeout(() => {
        // סגירת מודאל אישור בקשה
        setShowApproveModal(false);

        // סגירת מודאל דחיית בקשה
        setShowRejectModal(false);

        // ביטול חלון אישור פעולה (אם קיים)
        setConfirmAction(null);

        // ניקוי הבקשה שנבחרה
        setSelectedRequest(null);
      }, 1500);

      // ניקוי הטיימר אם הקומפוננטה מתעדכנת
      return () => clearTimeout(timer);
    }
  }, [msg]);

  /* =====================================================
     שליפת בקשות מהשרת
  ===================================================== */
  async function loadRequests() {
    try {
      const res = await fetch(`${API_BASE}/api/manageRequests`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setRequests(data);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("שגיאה בטעינת בקשות:", error);
      setMsg({
        type: "error",
        text: "שגיאה בטעינת הבקשות",
      });
    }
  }

  /* =====================================================
     שליפת מדריכים
  ===================================================== */
  async function loadAvailableGuides(date, time, duration) {
    try {
      const res = await fetch(
        `${API_BASE}/api/manageRequests/available-guides?trip_date=${date}&trip_time=${time}&duration_minutes=${duration}`,
      );
      const data = await res.json();
      //console.log("GUIDES:", data); // לבדיקה
      setGuides(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("שגיאה בשליפת מדריכים פנויים:", error);
    }
  }

  /* =====================================================
     פתיחת חלון אישור בקשה
     ממלא את הנתונים המקוריים שהמשתמש ביקש
  ===================================================== */
  /* פתיחת חלון אישור בקשה */
  function openApproveModal(request) {
    /* המרת תאריך בלי שינוי יום */
    let formattedDate = "";

    if (request.trip_date) {
      const d = new Date(request.trip_date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      formattedDate = `${year}-${month}-${day}`;
    }

    setSelectedRequest(request);

    setChangeGuide(false);
    setChangeDateTime(false);

    setApproveData({
      trip_date: formattedDate,
      trip_time: request.trip_time?.slice(0, 5) || "",
      meeting_point: "",
      guide_id: request.guide_id || "",
      change_reason: "",
    });

    setShowApproveModal(true);

    setTimeout(() => {
      loadAvailableGuides(
        formattedDate,
        request.trip_time?.slice(0, 5),
        request.duration_minutes,
      );
    }, 0);
  }
  /* =====================================================
     אישור בקשה
     אם בוצע שינוי -> חובה סיבה
  ===================================================== */
  async function approveRequest() {
    if (!selectedRequest) return;

    /* בדיקה אם המנהל שינה תאריך או שעה */
    /* בדיקה אם התאריך המקורי */
    let originalDate = "";
    if (selectedRequest.trip_date) {
      const d = new Date(selectedRequest.trip_date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      originalDate = `${year}-${month}-${day}`;
    }

    /* בדיקה אם השעה המקורית */
    const originalTime = selectedRequest.trip_time
      ? selectedRequest.trip_time.slice(0, 5)
      : "";

    /* בדיקה אם המנהל באמת שינה תאריך או שעה */
    let dateOrTimeChanged = false;

    if (changeDateTime) {
      if (
        approveData.trip_date !== originalDate ||
        approveData.trip_time !== originalTime
      ) {
        dateOrTimeChanged = true;
      }
    }

    /* בדיקה אם המנהל באמת שינה מדריך */
    let guideChanged = false;

    if (changeGuide) {
      if (
        String(approveData.guide_id) !== String(selectedRequest.guide_id || "")
      ) {
        guideChanged = true;
      }
    }

    /* האם באמת נעשה שינוי */
    const somethingChanged = dateOrTimeChanged || guideChanged;

    /* אם נעשה שינוי חייבים סיבה */
    if (dateOrTimeChanged && !approveData.change_reason.trim()) {
      setMsg({ type: "error", text: "חובה סיבה לשינוי תאריך/שעה" });
      return;
    }

    if (guideChanged && !guideChangeReason.trim()) {
      setMsg({ type: "error", text: "חובה סיבה להחלפת מדריך" });
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/manageRequests/approve/${selectedRequest.request_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...approveData,
            guide_change_reason: guideChangeReason,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setMsg({
          type: "error",
          text: data.message || "שגיאה באישור הבקשה",
        });
        return;
      }

      setMsg({
        type: "success",
        text: data.message || "הבקשה אושרה בהצלחה",
      });

      loadRequests();
    } catch (error) {
      console.error("שגיאה באישור בקשה:", error);
      setMsg({
        type: "error",
        text: "שגיאה באישור הבקשה",
      });
    }
  }

  /* =====================================================
     פתיחת חלון דחייה
  ===================================================== */
  function openRejectModal(request) {
    setSelectedRequest(request);
    setReason("");
    setShowRejectModal(true);
  }

  /* =====================================================
     דחיית בקשה
  ===================================================== */
  async function rejectRequest() {
    if (!selectedRequest) return;

    if (!reason.trim()) {
      setMsg({
        type: "error",
        text: "חובה לכתוב סיבה לדחייה",
      });
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/manageRequests/reject/${selectedRequest.request_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setMsg({
          type: "error",
          text: data.message || "שגיאה בדחיית הבקשה",
        });
        return;
      }

      setMsg({
        type: "success",
        text: data.message || "הבקשה נדחתה",
      });

      loadRequests();
    } catch (error) {
      console.error("שגיאה בדחיית בקשה:", error);
      setMsg({
        type: "error",
        text: "שגיאה בדחיית הבקשה",
      });
    }
  }

  /* =====================================================
     אישור ביטול בקשה
  ===================================================== */
  async function approveCancel(id) {
    try {
      const res = await fetch(
        `${API_BASE}/api/manageRequests/approveCancel/${id}`,
        { method: "PUT" },
      );

      const data = await res.json();

      if (!res.ok) {
        setMsg({
          type: "error",
          text: data.message || "שגיאה באישור ביטול הבקשה",
        });
        return;
      }

      setMsg({
        type: "success",
        text: data.message || "בקשת הביטול אושרה",
      });

      loadRequests();
    } catch (error) {
      console.error("שגיאה באישור ביטול:", error);
      setMsg({
        type: "error",
        text: "שגיאה באישור ביטול הבקשה",
      });
    }
  }

  /* =====================================================
     סינון בקשות לפי סטטוס
  ===================================================== */
  const filteredRequests = requests.filter((req) => {
    if (filter === "all") return true;
    if (filter === "pending") return req.status === "ממתין";
    if (filter === "approved") return req.status === "מאושר";
    if (filter === "rejected") return req.status === "נדחה";
    if (filter === "cancel") return req.cancel_requested === 1;
    if (filter === "canceled") return req.status === "מבוטל";

    return true;
  });

  /* =====================================================
   פתיחת חלון דחיית בקשת ביטול (כמו approve)
===================================================== */
  function openRejectCancelModal(request) {
    // שמירת הבקשה שנבחרה
    setSelectedRequest(request);

    // הפעלת מצב דחיית ביטול
    setIsRejectCancelMode(true);

    setGuideChangeReason(""); // ניקוי סיבת מדריך

    // ניקוי סיבה
    setReason("");

    /* המרת תאריך כמו approve */
    let formattedDate = "";

    if (request.trip_date) {
      const d = new Date(request.trip_date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      formattedDate = `${year}-${month}-${day}`;
    }

    // הכנסת הנתונים ל־approveData
    setApproveData({
      trip_date: formattedDate,
      trip_time: request.trip_time?.slice(0, 5) || "",
      meeting_point: "",
      guide_id: request.guide_id || "",
      change_reason: "",
    });

    // פתיחת מודאל approve במקום reject
    setShowApproveModal(true);

    // =========================================
    // חשוב:
    // בדחיית ביטול גם צריך לטעון מדריכים פנויים
    // בדיוק כמו באישור בקשה רגילה
    // =========================================
    setTimeout(() => {
      loadAvailableGuides(
        formattedDate,
        request.trip_time?.slice(0, 5),
        request.duration_minutes,
      );
    }, 0);
  }

  /* =====================================================
   דחיית בקשת ביטול (עם כל הנתונים כמו approve)
===================================================== */
  async function rejectCancel() {
    // אם אין בקשה נבחרת לא עושים כלום
    if (!selectedRequest) return;

    // חובה סיבה לדחיית ביטול
    if (!reason.trim()) {
      setMsg({
        type: "error",
        text: "חובה לכתוב סיבה לדחיית הביטול",
      });
      return;
    }

    /* בדיקה אם המנהל שינה תאריך או שעה */
    /* בדיקה אם התאריך המקורי */
    let originalDate = "";
    if (selectedRequest.trip_date) {
      const d = new Date(selectedRequest.trip_date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      originalDate = `${year}-${month}-${day}`;
    }

    /* בדיקה אם השעה המקורית */
    const originalTime = selectedRequest.trip_time
      ? selectedRequest.trip_time.slice(0, 5)
      : "";

    /* בדיקה אם המנהל באמת שינה תאריך או שעה */
    let dateOrTimeChanged = false;

    if (changeDateTime) {
      if (
        approveData.trip_date !== originalDate ||
        approveData.trip_time !== originalTime
      ) {
        dateOrTimeChanged = true;
      }
    }

    /* בדיקה אם המנהל באמת שינה מדריך */
    let guideChanged = false;

    if (changeGuide) {
      if (
        String(approveData.guide_id) !== String(selectedRequest.guide_id || "")
      ) {
        guideChanged = true;
      }
    }

    /* האם באמת נעשה שינוי */
    const somethingChanged = dateOrTimeChanged || guideChanged;

    /* אם נעשה שינוי חייבים סיבה */
    if (somethingChanged && !approveData.change_reason.trim()) {
      setMsg({
        type: "error",
        text: "חובה לכתוב סיבה לשינוי שביצעת",
      });
      return;
    }

    // בדיקה שחובה למלא נקודת מפגש
    /* רק אם אין קבוצה */
    if (!hasGroup && !approveData.meeting_point.trim()) {
      setMsg({
        type: "error",
        text: "חובה למלא נקודת מפגש",
      });
      return;
    }

    try {
      const bodyData = {
        reason: reason,
      };

      /* אם אין קבוצה – שולחים את כל הנתונים */
      if (!hasGroup) {
        bodyData.trip_date = approveData.trip_date;
        bodyData.trip_time = approveData.trip_time;
        bodyData.meeting_point = approveData.meeting_point;
        bodyData.guide_id = approveData.guide_id;
        bodyData.change_reason = approveData.change_reason;
        bodyData.guide_change_reason = guideChangeReason;
      }
      const res = await fetch(
        `${API_BASE}/api/manageRequests/rejectCancel/${selectedRequest.request_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(bodyData),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setMsg({
          type: "error",
          text: data.message,
        });
        return;
      }

      // הצלחה
      setMsg({
        type: "success",
        text: data.message,
      });

      setReason(""); // ניקוי סיבה

      // איפוס טופס
      setApproveData({
        trip_date: "",
        trip_time: "",
        meeting_point: "",
        guide_id: "",
        change_reason: "",
      });

      // איפוס מצבים
      setChangeGuide(false);
      setChangeDateTime(false);
      setGuideChangeReason(""); // ניקוי סיבת מדריך

      // רענון
      loadRequests();
    } catch (error) {
      console.error("שגיאה:", error);

      setMsg({
        type: "error",
        text: "שגיאה בדחיית ביטול",
      });
    }
  }

  /* =====================================================
   בדיקה אם כבר קיימת קבוצה לבקשה
===================================================== */
  const hasGroup = selectedRequest?.group_id != null;

  // ==============================
  // חישוב סטטיסטיקות בקשות
  // ==============================
  const stats = requests.reduce(
    (acc, r) => {
      acc.total++;

      if (r.cancel_requested === 1) {
        acc.cancelRequests++; // בקשות ביטול
      }

      if (r.status === "ממתין") acc.pending++;
      else if (r.status === "מאושר") acc.approved++;
      else if (r.status === "נדחה") acc.rejected++;
      else if (r.status === "מבוטל") acc.cancelled++; // 🔥 זה היה חסר לך

      return acc;
    },
    {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelRequests: 0, // בקשות ביטול
      cancelled: 0, // מבוטל בפועל
    },
  );

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.topBar}>
        {/* כפתורי סינון */}
        <div className={styles.topBarRow}>
          <h1 className={styles.title}>ניהול בקשות טיול</h1>
          <div className={styles.statsRow}>
            {/* סך הכל */}
            <div className={styles.statBox}>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statLabel}>סה״כ</div>
            </div>

            {/* ממתין */}
            <div className={`${styles.statBox} ${styles.plannedBox}`}>
              <div className={styles.statNumber}>{stats.pending}</div>
              <div className={styles.statLabel}>ממתין</div>
            </div>

            {/* מאושר */}
            <div className={`${styles.statBox} ${styles.inProgressBox}`}>
              <div className={styles.statNumber}>{stats.approved}</div>
              <div className={styles.statLabel}>מאושר</div>
            </div>

            {/* נדחה */}
            <div className={`${styles.statBox} ${styles.cancelledsBox}`}>
              <div className={styles.statNumber}>{stats.rejected}</div>
              <div className={styles.statLabel}>נדחה</div>
            </div>

            {/* בקשת ביטול */}
            <div className={`${styles.statBox} ${styles.finishedBox}`}>
              <div className={styles.statNumber}>{stats.cancelRequests}</div>
              <div className={styles.statLabel}>בקשת ביטול</div>
            </div>

            {/* מבוטל */}
            <div className={`${styles.statBox} ${styles.cancelledBox}`}>
              <div className={styles.statNumber}>{stats.cancelled}</div>
              <div className={styles.statLabel}>מבוטל</div>
            </div>
            <div className={styles.filterBox}>
              <label className={styles.filterLabel}>סינון:</label>

              <select
                className={styles.filterSelect}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">כל הבקשות</option>
                <option value="pending">ממתינות</option>
                <option value="approved">מאושרות</option>
                <option value="rejected">נדחו</option>
                <option value="cancel">בקשות ביטול</option>
                <option value="canceled">מבוטל</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      {/* טבלת הבקשות */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>לקוח</th>
            <th>מסלול</th>
            <th>תאריך</th>
            <th>שעה</th>
            <th>מדריך</th>
            <th>
              משתתפים /<br /> רכבים
            </th>
            <th>סטטוס</th>
            <th>הודעות</th>
            <th>פעולות</th>
          </tr>
        </thead>

        <tbody>
          {filteredRequests.length === 0 ? (
            <tr>
              <td colSpan="8">אין בקשות להצגה</td>
            </tr>
          ) : (
            filteredRequests.map((req) => (
              <tr
                key={req.request_id} // מזהה ייחודי לכל שורה
                className={(() => {
                  const now = new Date();
                  const tripDate = new Date(req.trip_date);

                  // מאפסים שעות כדי לא לקבל שברים
                  now.setHours(0, 0, 0, 0);
                  tripDate.setHours(0, 0, 0, 0);

                  const diffDays = (tripDate - now) / (1000 * 60 * 60 * 24);

                  const isUrgent = diffDays >= 0 && diffDays <= 2;

                  const isPending = req.status === "ממתין";
                  const isCancelRequest = req.cancel_requested === 1;

                  const shouldBlink =
                    isUrgent && (isPending || isCancelRequest);

                  return shouldBlink ? styles.urgentRow : "";
                })()}
              >
                <td>
                  {/* שם לקוח לחיץ */}
                  <span
                    style={{ cursor: "pointer", color: "#38bdf8" }}
                    onClick={() => openUserDetails(req)}
                  >
                    {req.user_name}
                  </span>
                </td>
                <td>{req.trail_name}</td>
                <td>
                  <div>
                    {req.trip_date
                      ? new Date(req.trip_date).toLocaleDateString("he-IL")
                      : "—"}
                  </div>

                  {req.changed_trip_date &&
                    req.changed_trip_date !== req.trip_date && (
                      <div className={styles.changedValue}>
                        <FaExchangeAlt className={styles.changeIcon} />
                        {new Date(req.changed_trip_date).toLocaleDateString(
                          "he-IL",
                        )}
                      </div>
                    )}
                </td>
                <td>
                  {req.trip_time?.slice(0, 5)}

                  {req.changed_trip_time &&
                    req.changed_trip_time !== req.trip_time && (
                      <div className={styles.changedValue}>
                        <FaExchangeAlt className={styles.changeIcon} />
                        {req.changed_trip_time?.slice(0, 5)}
                      </div>
                    )}
                </td>
                <td>
                  <div>{req.guide_name || "—"}</div>

                  {req.changed_guide_name &&
                    req.changed_guide_name !== req.guide_name && (
                      <div className={styles.changedValue}>
                        <FaExchangeAlt className={styles.changeIcon} />
                        {req.changed_guide_name}
                      </div>
                    )}
                </td>
                <td>
                  <div className={styles.peopleCars}>
                    <span>
                      <FaUser className={styles.smallIcon} />
                      {req.number_of_participants}
                    </span>

                    <span>
                      <FaCar className={styles.smallIcon} />
                      {req.trail_type === "רגלי" ? "—" : req.number_of_vehicles}
                    </span>
                  </div>
                </td>
                <td>{req.status}</td>

                {/* עמודת הודעות */}
                <td>
                  {/* מציג אייקון רק אם קיימות הודעות */}
                  {(req.cancel_reason ||
                    req.reject_reason ||
                    req.cancel_reject_reason ||
                    req.change_reason) && (
                    <FaEye
                      className={styles.viewing}
                      title="צפייה בהודעות"
                      onClick={() => openMessages(req)}
                    />
                  )}
                </td>

                <td>
                  <div className={styles.actionsRow}>
                    {req.status === "ממתין" && (
                      <>
                        <button
                          className={styles.approveBtn}
                          onClick={() => openApproveModal(req)}
                        >
                          אשר
                        </button>

                        <button
                          className={styles.rejectBtn}
                          onClick={() => openRejectModal(req)}
                        >
                          דחה
                        </button>
                      </>
                    )}

                    {req.cancel_requested === 1 && (
                      <>
                        <button
                          className={styles.cancelBtn}
                          onClick={() =>
                            setConfirmAction({
                              type: "approveCancel",
                              id: req.request_id,
                              text: "האם אתה בטוח שברצונך לאשר את ביטול הבקשה?",
                            })
                          }
                        >
                          אשר ביטול
                        </button>

                        <button
                          className={styles.rejectBtn}
                          onClick={() => openRejectCancelModal(req)}
                        >
                          דחה ביטול
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* מודאל אישור בקשה */}
      {showApproveModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>
              {isRejectCancelMode ? "דחיית בקשת ביטול" : "אישור בקשה"}
            </h2>

            {/* סיבת דחיית ביטול */}
            {isRejectCancelMode && (
              <div className={styles.infoSection}>
                <label className={styles.inputLabel}>סיבה לדחיית ביטול</label>

                <textarea
                  className={styles.textarea}
                  placeholder="כתוב סיבה לדחיית הביטול"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}

            {/* =====================================================
   הצגת שדות רק אם:
   - לא דחיית ביטול
   - או שאין קבוצה
===================================================== */}
            {(!isRejectCancelMode || !hasGroup) && (
              <>
                {/* בלוק תאריך ושעה */}
                <div className={styles.infoSection}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>תאריך:</span>
                    <span className={styles.infoValue}>
                      {approveData.trip_date
                        ? new Date(approveData.trip_date).toLocaleDateString(
                            "he-IL",
                          )
                        : ""}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>שעה:</span>
                    <span className={styles.infoValue}>
                      {approveData.trip_time}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setChangeDateTime(true)}
                  >
                    שינוי תאריך / שעה
                  </button>

                  {changeDateTime && (
                    <div className={styles.editBox}>
                      <input
                        className={styles.input}
                        type="date"
                        value={approveData.trip_date}
                        onChange={(e) => {
                          const newDate = e.target.value;

                          setApproveData({
                            ...approveData,
                            trip_date: newDate,
                          });

                          loadAvailableGuides(
                            newDate,
                            approveData.trip_time,
                            selectedRequest.duration_minutes,
                          );
                        }}
                      />

                      <input
                        className={styles.input}
                        type="time"
                        value={approveData.trip_time}
                        onChange={(e) => {
                          const newTime = e.target.value;

                          setApproveData({
                            ...approveData,
                            trip_time: newTime,
                          });

                          loadAvailableGuides(
                            approveData.trip_date,
                            newTime,
                            selectedRequest.duration_minutes,
                          );
                        }}
                      />

                      <textarea
                        className={styles.textarea}
                        placeholder="סיבה לשינוי תאריך / שעה"
                        value={approveData.change_reason}
                        onChange={(e) =>
                          setApproveData({
                            ...approveData,
                            change_reason: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                {/* נקודת מפגש */}
                <div className={styles.infoSection}>
                  <label className={styles.inputLabel}>נקודת מפגש</label>
                  <input
                    className={styles.input}
                    placeholder="הכנס נקודת מפגש"
                    value={approveData.meeting_point}
                    onChange={(e) =>
                      setApproveData({
                        ...approveData,
                        meeting_point: e.target.value,
                      })
                    }
                  />
                </div>

                {/* בלוק מדריך */}
                <div className={styles.infoSection}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>המדריך שנבחר:</span>
                    <span className={styles.infoValue}>
                      {selectedRequest?.guide_name || "לא נבחר מדריך"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setChangeGuide(true)}
                  >
                    החלפת מדריך
                  </button>

                  {changeGuide && (
                    <div className={styles.editBox}>
                      <select
                        className={styles.select}
                        value={approveData.guide_id}
                        onChange={(e) =>
                          setApproveData({
                            ...approveData,
                            guide_id: e.target.value,
                          })
                        }
                      >
                        <option value="">בחר מדריך</option>

                        {guides.map((g) => (
                          <option key={g.user_id} value={g.user_id}>
                            {g.full_name}
                          </option>
                        ))}
                      </select>

                      <textarea
                        className={styles.textarea}
                        placeholder="סיבה להחלפת מדריך"
                        value={guideChangeReason} // שומר רק סיבת מדריך
                        onChange={(e) => setGuideChangeReason(e.target.value)} // עדכון state
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {isRejectCancelMode && hasGroup && (
              <div className={styles.inlineMsg}>
                כבר קיימת קבוצה – אין צורך להזין פרטים מחדש
              </div>
            )}

            {/* הודעת מערכת */}
            {msg.text && (
              <div
                className={`${styles.inlineMsg} ${
                  msg.type === "success"
                    ? styles.inlineSuccess
                    : styles.inlineError
                }`}
              >
                {msg.text}
              </div>
            )}

            {/* כפתורי פעולה */}
            <div className={styles.modalActions}>
              <button
                className={styles.saveBtn}
                onClick={isRejectCancelMode ? rejectCancel : approveRequest}
              >
                {isRejectCancelMode ? "דחה ביטול וצור קבוצה" : "אשר בקשה"}
              </button>

              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowApproveModal(false); // סגירת מודאל
                  setSelectedRequest(null); // ניקוי בקשה

                  setIsRejectCancelMode(false); // 🔥 איפוס מצב דחיית ביטול

                  setReason(""); // ניקוי סיבה

                  setGuideChangeReason(""); // ניקוי סיבת מדריך

                  // ניקוי נתונים
                  setApproveData({
                    trip_date: "",
                    trip_time: "",
                    meeting_point: "",
                    guide_id: "",
                    change_reason: "",
                  });

                  // איפוס מצבי שינוי
                  setChangeGuide(false);
                  setChangeDateTime(false);
                }}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* מודאל דחיית בקשה */}
      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>
              {selectedRequest?.cancel_requested
                ? "דחיית בקשת ביטול"
                : "דחיית בקשה"}
            </h2>

            <textarea
              placeholder="כתוב סיבה לדחייה"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {/* הודעת הצלחה / שגיאה בתוך הדף */}
            {msg.text && (
              <div
                className={`${styles.inlineMsg} ${
                  msg.type === "success"
                    ? styles.inlineSuccess
                    : styles.inlineError
                }`}
              >
                {msg.text}
              </div>
            )}
            {/* כפתור דחייה – מחליט אם מדובר בדחיית בקשה רגילה או דחיית ביטול */}
            <div className={styles.modalActions}>
              <button
                className={styles.deleteBtn}
                onClick={
                  selectedRequest?.cancel_requested
                    ? rejectCancel
                    : rejectRequest
                }
              >
                דחה בקשה
              </button>

              <button
                className={styles.close}
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                }}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmAction && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* הודעת אישור */}
            <p>{confirmAction.text}</p>
            <div className={styles.modalActions}>
              <button
                className={styles.saveBtn}
                onClick={() => {
                  if (confirmAction.type === "approveCancel") {
                    approveCancel(confirmAction.id);
                  }
                  setConfirmAction(null);
                }}
              >
                אישור
              </button>

              <button
                className={styles.close}
                onClick={() => setConfirmAction(null)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
       מודאל להצגת כל ההודעות של הבקשה
      ===================================================== */}

      {showMessagesModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>היסטוריית הודעות</h2>

            {/* אם אין הודעות */}
            {messages.length === 0 && <p>אין הודעות להצגה</p>}

            {/* הצגת כל ההודעות */}
            {messages.map((m, index) => (
              <div key={index} className={styles.messageRow}>
                <strong>{m.sender}:</strong>

                <div>{m.text}</div>
              </div>
            ))}
            <br />

            {/* כפתור סגירה */}
            <div className={styles.btnRow}>
              <button
                className={styles.closeBtn}
                onClick={() => setShowMessagesModal(false)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
   מודאל פרטי לקוח
========================================= */}
      {showUserModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>פרטי לקוח</h2>

            {/* שם */}
            <p>
              <strong>שם:</strong> {selectedUser?.user_name}
            </p>

            {/* =========================
         טלפון
      ========================= */}
            <p>
              <strong>טלפון:</strong>{" "}
              {selectedUser?.user_phone ? (
                <>
                  {/* אייקון חיוג */}
                  <a href={`tel:${selectedUser.user_phone}`}>
                    <FaPhone className={styles.phoneIcon} />
                  </a>{" "}
                  {/* מספר */}
                  {selectedUser.user_phone} {/* אייקון WhatsApp */}
                  <a
                    href={`https://wa.me/${formatPhoneForWhatsapp(
                      selectedUser.user_phone,
                    )}`}
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

            {/* =========================
         אימייל
      ========================= */}
            <p>
              <strong>אימייל:</strong>{" "}
              {selectedUser?.user_email ? (
                <>
                  <a href={`mailto:${selectedUser.user_email}`}>
                    <FaEnvelope className={styles.emailIcon} />
                  </a>{" "}
                  {selectedUser.user_email}
                </>
              ) : (
                "לא קיים"
              )}
            </p>

            {/* כפתור סגירה */}
            <div className={styles.btnRow}>
              <button
                className={styles.closeBtn}
                onClick={() => setShowUserModal(false)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
