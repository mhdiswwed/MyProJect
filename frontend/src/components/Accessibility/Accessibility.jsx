/**
 * Accessibility.jsx
 * ------------------------------------
 * דף הצהרת נגישות לאתר Trail Quest
 */

import classes from "./accessibility.module.css";

function Accessibility() {
  return (
    <section className={classes.wrapper}>
      <h1 className={classes.title}>הצהרת נגישות</h1>

      <p className={classes.text}>
        אתר Trail Quest פועל להנגשת תכניו ושירותיו לכלל המשתמשים, מתוך מחויבות
        לשוויון, כבוד ונגישות עבור אנשים עם מוגבלויות.
      </p>

      <h2 className={classes.subTitle}>התאמות נגישות באתר</h2>

      <ul className={classes.list}>
        <li>ניווט נוח וברור באמצעות מקלדת</li>
        <li>מבנה דפים אחיד עם היררכיה ברורה של כותרות</li>
        <li>טקסטים קריאים וניגודיות צבעים גבוהה</li>
        <li>שימוש בתגיות alt לתמונות</li>
        <li>התאמה למכשירים ניידים ולמסכים שונים</li>
      </ul>

      <h2 className={classes.subTitle}>תמיכה בטכנולוגיות מסייעות</h2>

      <p className={classes.text}>
        האתר מותאם לשימוש עם טכנולוגיות מסייעות כגון קוראי מסך, ומיועד לאפשר
        חוויית שימוש נוחה ככל האפשר.
      </p>

      <h2 className={classes.subTitle}>יצירת קשר בנושא נגישות</h2>

      <p className={classes.text}>
        אם נתקלת בבעיה כלשהי בנושא נגישות, נשמח שתעדכן אותנו כדי שנוכל לשפר:
      </p>

      <p className={classes.contact}>
        📧 אימייל: Mhdi.swwed1996@gmail.com <br />
        📞 טלפון: 050-6674097
      </p>

      <p className={classes.footerText}>
        אנו ממשיכים לפעול לשיפור נגישות האתר באופן שוטף.
      </p>
    </section>
  );
}

export default Accessibility;
