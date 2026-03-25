/**
 * Footer.jsx
 * --------------------------------------------------
 * קומפוננטת Footer קבועה לתחתית המסך.
 *
 * תפקיד:
 * - להציג מידע כללי על הפרויקט (שם, שנה, קבוצה)
 * - להיות מוצג בכל דפי המערכת (למעט Login אם נרצה)
 * - לשמור על עיצוב אחיד עם ה-Header (Glass / Dark UI)
 *
 * Props:
 * @param {string} prog - מספר / שם הקבוצה
 * @param {string|number} year - שנת הפרויקט
 */

import styles from "./footer.module.css";

export default function Footer({ prog, year }) {
  return (
    <footer className={styles.footer}>
      {/* קונטיינר פנימי – העיצוב עצמו */}
      <div className={styles.container}>
        {/* שם המערכת + שנה */}
        <span>Trail Quest © {year}</span>

        {/* מפריד ויזואלי */}
        <span className={styles.sep}> | </span>

        {/* פרטי קבוצה / מסלול לימודים */}
        <span>Project Mhdi swwed {prog}</span>
      </div>
    </footer>
  );
}
