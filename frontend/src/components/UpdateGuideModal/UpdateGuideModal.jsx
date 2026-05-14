/*// ==========================================================================
UpdateGuideModal
קומפוננטת מודאל להחלפת מדריך בקבוצה, מציגה מדריכים פנויים ומאפשרת שליחת עדכון עם סיבת החלפה
// ===========================================================================*/

import { useEffect, useState } from "react";
import styles from "./updateGuideModal.module.css";
import API_BASE from "../../config/api";
import Select from "react-select";

export default function UpdateGuideModal({ group, onClose, onSuccess }) {
  const [guides, setGuides] = useState([]);
  const [guideId, setGuideId] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  // =========================
  // טעינת מדריכים פנויים
  // =========================
  useEffect(() => {
    if (!group) return;
    loadGuides();
  }, [group]);

  async function loadGuides() {
    try {
      const res = await fetch(
        `${API_BASE}/api/updateGroup/available-guides?date=${group.trip_date}&time=${group.trip_time}&group_id=${group.group_id}`,
      );
  

      const data = await res.json();
      setGuides(data);
    } catch (err) {
      console.error(err);
    }
  }

  // =========================
  // עדכון מדריך
  // =========================
  async function updateGuide() {
    if (!guideId) {
      setMsg({ type: "error", text: "בחר מדריך" });
      return;
    }

    if (!reason.trim()) {
      setMsg({ type: "error", text: "חובה להזין סיבה" });
      return;
    }

    try {
     const res = await fetch(
       `${API_BASE}/api/updateGroup/change-guide/${group.group_id}`,
       {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           guide_id: guideId,
           reason: reason, 
         }),
       },
     );

      const data = await res.json();

      setMsg({
        type: res.ok ? "success" : "error",
        text: data.message,
      });

      if (res.ok) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2300);
      }
    } catch (err) {
      setMsg({ type: "error", text: "שגיאה" });
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* כותרת */}
        <h2 className={styles.title}>החלפת מדריך</h2>

        {/* בלוק */}
        <div className={styles.section}>
          <Select
            className={styles.guideSelectCustom}
            classNamePrefix="react-select"
            placeholder="בחר מדריך פנוי"
            isRtl={true}
            options={guides.map((g) => ({
              value: g.user_id,
              label: g.full_name,
            }))}
            value={
              guides
                .map((g) => ({
                  value: g.user_id,
                  label: g.full_name,
                }))
                .find((option) => option.value == guideId) || null
            }
            onChange={(selected) => setGuideId(selected?.value || "")}
          />

          <textarea
            placeholder="סיבה להחלפה"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={styles.textarea}
          />
        </div>

        {/* הודעה */}
        {msg.text && (
          <div
            className={`${styles.msg} ${
              msg.type === "success" ? styles.success : styles.error
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* כפתורים */}
        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={updateGuide}>
            שמור
          </button>

          <button className={styles.closeBtn} onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
