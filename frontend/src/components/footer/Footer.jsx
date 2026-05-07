import { useNavigate, useLocation } from "react-router-dom";
import styles from "./footer.module.css";

export default function Footer({ prog, year }) {
  const navigate = useNavigate();
  const location = useLocation(); 

  function isActive(path) {
    return (
      location.pathname === path ||
      location.pathname.startsWith(path + "/")
    );
  }

  return (
    <footer className={styles.footer}>
      {/* תפריט באמצע */}
      <div className={styles.topNav}>
        <button
          className={`${styles.linkBtn} ${isActive("/about") ? styles.active : ""}`}
          onClick={() => navigate("/about")}
        >
          מי אנחנו
        </button>

        <button
          className={`${styles.linkBtn} ${isActive("/contact") ? styles.active : ""}`}
          onClick={() => navigate("/contact")}
        >
          צור קשר
        </button>

        <button
          className={`${styles.linkBtn} ${isActive("/accessibility") ? styles.active : ""}`}
          onClick={() => navigate("/accessibility")}
        >
          הצהרת נגישות
        </button>
      </div>

      {/* טקסט תחתון */}
      <div className={styles.container}>
        <span>Trail Quest © {year}</span>
        <span className={styles.sep}> | </span>
        <span>Project Mhdi Swwed {prog}</span>
      </div>
    </footer>
  );
}