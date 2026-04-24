/**
 * About.jsx
 * ------------------------------------
 * דף הבית של פרויקט Trail Quest
 * כולל מי אנחנו , תיאור הפרויקט
 * ופרטי מפתח האתר
 */

import classes from "./about.module.css";
import heroImage from "../../assets/mhdi.jpg";

function Home() {
  return (
    <section className={classes.home}>
      {/* כותרת */}
      <h1 className={classes.title}>Trail Quest</h1>

      {/* תיאור הפרויקט */}
      <p className={classes.text}>
        Trail Quest הוא אתר להצגת מסלולי טיול באזור בית ג׳ן וההרים הסובבים את
        הכפר.
      </p>

      <p className={classes.text}>
        האתר מתמקד במסלולים העוברים ביערות, ואדיות ושבילים טבעיים בסביבת בית
         ג׳ן, ומתאים למטיילים המעוניינים להכיר את הטבע.
      </p>

      <p className={classes.text}>
        במערכת ניתן לצפות במסלולים לפי סוגי פעילות: הליכה רגלית, ג׳יפים,
        טרקטורונים ורכיבה על סוסים.
      </p>

      <p className={classes.text}>
        הפרויקט פותח כחלק מפרויקט לימודי, תוך שימוש ב־React, עבודה עם קומפוננטות
        ועקרונות של פיתוח Front-End.
      </p>
      
      {/* תמונת פתיחה */}
      <div className={classes.imageWrapper}>
        <img
          src={heroImage}
          alt="מהדי סוויד - מפתח האתר"
          title="מהדי סויד"
          className={classes.image}
        />
      </div>

      {/* פרטי מפתח */}
      <p className={classes.footerText}>
        מפתח האתר: <strong>מהדי סויד</strong>, כפר בית ג׳ן, הגליל העליון
      </p>
    </section>
  );
}

export default Home;
