/**
 * TrailCube.jsx
 * ------------------------------------------------
 * קומפוננטה ראשית להצגת מסלולים
 *
 * הקומפוננטה מציגה:
 * - קוביית 3D עם 4 פאות (סוגי מסלולים)
 * - וידאו בכל פאה
 * - רשימת כרטיסי מסלולים מהשרת
 * - עימוד (pagination)
 *
 * הנתונים נשלפים מהשרת (API)
 * ללא חיפוש / פילטר בצד React (רק הכנה למשתנים)
 */

import hikingVideo from "../../assets/hiking.mp4";
import jeepsVideo from "../../assets/jeeps.mp4";
import atvVideo from "../../assets/atv.mp4";
import horsesVideo from "../../assets/horses.mp4";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import styles from "./trailCube.module.css";
import TrailCard from "../TrailCard/TrailCard";

import logo from "../../assets/removebg-preview.png";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
/* אייקונים לשליטה על סאונד */
import { FaVolumeMute, FaVolumeUp } from "react-icons/fa";

import API_BASE from "../../config/api";

export default function TrailCube() {
  /* רשימת המסלולים שמגיעה מהשרת */
  const [trails, setTrails] = useState([]);

  /* טקסט חיפוש לפי שם (כרגע לא מופעל בצד לקוח) */
  const [search, setSearch] = useState("");

  /* פילטר סוג מסלול (רגלי, ג'יפים וכו') */
  const [typeFilter, setTypeFilter] = useState(null);

  /* מספר עמוד נוכחי */
  const [page, setPage] = useState(1);

  /* שליטה על השתקת הסרטונים (חדש)
     ברירת מחדל: מושתק*/
  const [isMuted, setIsMuted] = useState(true);


  /**
   * 8 כל פעם שליפת מסלולים מהשרת לפי עמוד
   * כל שינוי בעמוד – שולח בקשה חדשה לשרת
   */
  useEffect(() => {
    fetch(`${API_BASE}/api/trails?page=${page}`)
      .then((res) => res.json())
      .then((data) => setTrails(data));
  }, [page]);

  /* הפאה הפעילה בקובייה (0–3) */
  const [faceIndex, setFaceIndex] = useState(0);

  /* רפרנסים לוידאו של כל פאה בקובייה */
  const videosRef = useRef([]);

  /**
   * מעבר בין פאות הקובייה וסינון מסלולים לפי סוג
   * ------------------------------------------------
   * הפונקציה אחראית על שינוי הפאה הפעילה בקובייה
   * ועל שליפת מסלולים מהשרת בהתאם לסוג שנבחר.
   *
   * פרמטר:
   * i – מספר שלם המייצג את מיקום הפאה בקובייה (0 עד 3).
   *
   * תנאי כניסה:
   * הערך i חייב להיות בתחום 0–3.
   *
   * מהלך הפעולה:
   * 1. עדכון הפאה הפעילה בקובייה.
   * 2. התאמת מספר הפאה לסוג מסלול מתאים מתוך מערך הסוגים.
   * 3. שליחת בקשה לשרת לשליפת מסלולים לפי הסוג שנבחר.
   * 4. עדכון רשימת המסלולים בהתאם לתשובה שהתקבלה מהשרת.
   *
   * תנאי יציאה:
   * מוצגת רשימת מסלולים מסוננת לפי סוג.
   *
   * הערה:
   * ערך סוג המסלול חייב להיות זהה לערך השמור במסד הנתונים.
   * במקרה של אי התאמה – תוחזר רשימה ריקה.
   */
  function goTo(i) {
    setFaceIndex(((i % 4) + 4) % 4);

    const types = ["רגלי", "גיפים", "טרקטורונים", "סוסים"];
    const selectedType = types[i];

    setTypeFilter(selectedType);

    fetch(`${API_BASE}/api/trails/type/${selectedType}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTrails(data.data);
        }
      });
  }

  /**
   * אפקט שמופעל בכל שינוי פאה:
   * - עוצר את כל הסרטונים
   * - מפעיל רק את הסרטון של הפאה הפעילה
   */
  useEffect(() => {
    videosRef.current.forEach((video, index) => {
      if (!video) return;

      if (index === faceIndex) {
        video.currentTime = 0;
        video.play();
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [faceIndex]);

  //====================
  //חיפוש מסלול לפי שם
  //====================
  function handleSearch() {
    if (!search.trim()) return;

    fetch(`${API_BASE}/api/trails/search?name=${search}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTrails(data.data);
        }
      });
  }

  //====================
  // קשור לכפתור שמחזרת כל המסלולים
  //====================
  function resetTrails() {
    setTypeFilter(null);
    setSearch("");

    fetch(`${API_BASE}/api/trails?page=${page}`)
      .then((res) => res.json())
      .then((data) => setTrails(data));
  }
  return (
    <div className={styles.trailsPage}>
      {/* אזור עליון: קובייה + פאנל */}
      <div className={styles.cubeUi} dir="rtl">
        {/* פאנל ניווט וחיפוש */}
        <nav className={styles.faceNav}>
          {/* תיבת חיפוש לפי שם */}
          <div className={styles.searchBox}>
            <input
              type="search"
              placeholder="חפש לפי שם..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button type="button" onClick={handleSearch}>
              חיפוש
            </button>
          </div>

          {/* לוגו */}
          <img src={logo} alt="Trail Quest" className={styles.panelLogo} />

          {/* כפתורי מעבר בין פאות הקובייה */}
          <button
            className={`${styles.faceBtn} ${faceIndex === 0 ? styles.active : ""}`}
            onClick={() => goTo(0)}
          >
            מסלולי רגל
          </button>

          <button
            className={`${styles.faceBtn} ${faceIndex === 1 ? styles.active : ""}`}
            onClick={() => goTo(1)}
          >
            מסלולי ג׳יפים
          </button>

          <button
            className={`${styles.faceBtn} ${faceIndex === 2 ? styles.active : ""}`}
            onClick={() => goTo(2)}
          >
            מסלולי טרקטורונים
          </button>

          <button
            className={`${styles.faceBtn} ${faceIndex === 3 ? styles.active : ""}`}
            onClick={() => goTo(3)}
          >
            מסלולי סוסים
          </button>
        </nav>

        {/* קוביית 3D */}
        <div className={styles.scene}>
          <div
            className={styles.cube}
            style={{ transform: `rotateY(${-90 * faceIndex}deg)` }}
          >
            {/* פאה 0 – מסלולי רגל */}
            <div className={`${styles.cubeFace} ${styles.front}`}>
              <h2 className={styles.h2}>מסלולי רגל</h2>
              <p className={styles.sub}>
                טבע ירוק, צלילי נחלים ופסגות פתוחות — מסלולי הליכה לכל רמה ולקצב
                שלך.
              </p>
              <div className={styles.imgSlot}>
                {/* כפתור שליטה על סאונד (חדש) */}
                <button
                  className={styles.soundBtn}
                  onClick={() => setIsMuted((m) => !m)}
                >
                  {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                </button>
                <video
                  ref={(el) => (videosRef.current[0] = el)}
                  src={hikingVideo}
                  muted={isMuted}
                  loop
                  playsInline
                  className={styles.faceImg}
                />
              </div>
            </div>

            {/* פאה 1 – מסלולי ג׳יפים */}
            <div className={`${styles.cubeFace} ${styles.left}`}>
              <h2 className={styles.h2}>מסלולי ג׳יפים</h2>
              <p className={styles.sub}>
                מעברי מים וסלע, מצוקים ותצפיות — חוויית 4X4 קשוחה עם מדריכים
                מנוסים.
              </p>
              <div className={styles.imgSlot}>
                {/* כפתור שליטה על סאונד (חדש) */}
                <button
                  className={styles.soundBtn}
                  onClick={() => setIsMuted((m) => !m)}
                >
                  {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                </button>
                <video
                  ref={(el) => (videosRef.current[1] = el)}
                  src={jeepsVideo}
                  muted={isMuted}
                  loop
                  playsInline
                  className={styles.faceImg}
                />
              </div>
            </div>

            {/* פאה 2 – מסלולי טרקטורונים */}
            <div className={`${styles.cubeFace} ${styles.back}`}>
              <h2 className={styles.h2}>מסלולי טרקטורונים</h2>
              <p className={styles.sub}>
                אדרנלין בשטח פתוח — דיונות, שבילי 4X4 ונופי פרא במסלולים
                מודרכים.
              </p>
              <div className={styles.imgSlot}>
                {/* כפתור שליטה על סאונד (חדש) */}
                <button
                  className={styles.soundBtn}
                  onClick={() => setIsMuted((m) => !m)}
                >
                  {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                </button>
                <video
                  ref={(el) => (videosRef.current[2] = el)}
                  src={atvVideo}
                  muted={isMuted}
                  loop
                  playsInline
                  className={styles.faceImg}
                />
              </div>
            </div>

            {/* פאה 3 – מסלולי סוסים */}
            <div className={`${styles.cubeFace} ${styles.right}`}>
              <h2 className={styles.h2}>מסלולי סוסים</h2>
              <p className={styles.sub}>
                חיבור לאדמה בקצב דהירה — שבילי רכיבה נינוחים בין יערות ונחלים.
              </p>
              <div className={styles.imgSlot}>
                {/* כפתור שליטה על סאונד (חדש) */}
                <button
                  className={styles.soundBtn}
                  onClick={() => setIsMuted((m) => !m)}
                >
                  {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                </button>
                <video
                  ref={(el) => (videosRef.current[3] = el)}
                  src={horsesVideo}
                  muted={isMuted}
                  loop
                  playsInline
                  className={styles.faceImg}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* אזור כרטיסי המסלולים */}
      <div>
        {/* כפתור החזרת כל המסלולים */}
        <div className={styles.resetArea}>
          <button className={styles.resetBtn} onClick={resetTrails}>
            הצג את כל המסלולים
          </button>
        </div>
        <div className={styles.cardsArea}>
          {trails.map((trail) => (
            <TrailCard key={trail.trail_id} trail={trail} />
          ))}
        </div>

        {/* עימוד (pagination) */}
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            <FaChevronLeft />
          </button>

          <span className={styles.pageNum}>עמוד {page}</span>

          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => p + 1)}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
