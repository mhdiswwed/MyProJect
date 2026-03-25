/**
 * TrailCard.jsx
 * --------------------------------------------------
 * כרטיס תצוגה למסלול בודד
 *
 * תפקיד:
 * - להציג תמונה ונתוני מסלול
 * - לאפשר מעבר לדף פרטי מסלול
 *   באמצעות React Router
 */

import styles from "./trailCard.module.css";
import { FaRoute, FaMountain, FaRulerHorizontal } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
export default function TrailCard({ trail }) {
  const navigate = useNavigate();

  /**
   * מעבר לדף פרטי המסלול
   * ה־id נכנס ל־URL
   */
  function openDetails() {
    navigate(`/trails/${trail.trail_id}`);
  }

  return (
    <div className={styles.card}>
      <img
        src={`${API_BASE}/uploads/images/${trail.images}`}
        alt={trail.trail_name}
        title={trail.trail_name}
        className={styles.image}
      />

      <div className={styles.body}>
        <h3 className={styles.title}>{trail.trail_name}</h3>
        <p className={styles.desc}>{trail.description}</p>

        <div className={styles.meta}>
          <p>
            <FaRoute /> {trail.trail_type}
          </p>
          <p>
            <FaMountain /> {trail.difficulty_level}
          </p>
          <p>
            <FaRulerHorizontal /> {trail.length_km} ק"מ
          </p>
        </div>

        {/* מעבר לדף פרטי המסלול */}
        <div className={styles.actions}>
          <button className={styles.btn} onClick={openDetails}>
            צפה בפרטים
          </button>
        </div>
      </div>
    </div>
  );
}
