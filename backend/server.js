/* מפתח:
 * מהדי סוויד
 * ת"ז:314734039
 */


/**
 * טעינת משתני סביבה מתוך קובץ .env
 * חובה לקרוא לזה לפני שימוש ב-process.env
 */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");

const authRoutes = require("./routes/auth");
const trailsRoutes = require("./routes/trails");
const ManagementTrailsRoutes = require("./routes/ManagementTrails");
const TrailDetailsAndrequests = require("./routes/TrailDetailsAndrequests");
const DataUpdate = require("./routes/DataUpdate");
const trailNavigationRouter = require("./routes/trailNavigationRouter");
const myRequests = require("./routes/myRequests");
const myReports = require("./routes/myReports");
const SystemSettings = require("./routes/SystemSettings");
const manageRequestsRoutes = require("./routes/manageRequests");
const UsersManagement = require("./routes/UsersManagement");
const ManageGuidances = require("./routes/ManageGuidances");
const myGuidances = require("./routes/myGuidances");
const manageGroupsRouter = require("./routes/ManageGroups");
const updateGroup = require("./routes/UpdateGroup");
const fieldReportsRouter = require("./routes/FieldReports");
const CreateTaskModal = require("./routes/CreateTaskModal");



const app = express();




/* ==========================================================
   CORS
========================================================== */
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

/* ==========================================================
   קריאת נתונים מהלקוח
   ⚠️ חשוב: שני אלה חייבים להיות יחד
========================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==========================================================
   קבצים סטטיים (תמונות / gpx)
========================================================== */
app.use("/uploads", express.static("uploads"));
/* ==========================================================
   session
========================================================== */
app.use(
  session({
    // מפתח סודי המשמש לחתימה ולהצפנה של מזהה ההתחברות
    // מונע זיוף התחברות על ידי משתמשים זדוניים
    secret: "trailquest-secret-key",

    // מונע שמירה מחדש של נתוני ההתחברות אם לא בוצע שינוי
    // משפר ביצועים ומפחית עומס על השרת
    resave: false,

    // יוצר נתוני התחברות רק לאחר שהמשתמש ביצע התחברות
    // ולא לכל גולש שנכנס לאתר
    saveUninitialized: false,

    cookie: {
      // קובע כמה זמן נתוני ההתחברות נשמרים בדפדפן
      // כאן: שעתיים
      maxAge: 1000 * 60 * 60 * 2,

      // מאפשר שליחת מזהה ההתחברות גם בין אתרים או פורטים שונים
      // נדרש כאשר צד הלקוח וצד השרת רצים על פורטים שונים
      sameSite: "Lax",

      // מאפשר שימוש במזהה ההתחברות גם ללא חיבור מאובטח
      // משמש לפיתוח מקומי, בפרודקשן חייב להיות מופעל
      secure: false,
    },
  }),
);

/* ==========================================================
   routes
    חשוב: אחרי ה־middleware
========================================================== */
app.use("/api/auth", authRoutes);
app.use("/api/trails", trailsRoutes);
app.use("/api/ManagementTrails", ManagementTrailsRoutes);
app.use("/api/TrailDetailsAndrequests", TrailDetailsAndrequests);
app.use("/api/DataUpdate", DataUpdate);
app.use("/api/trailNavigation", trailNavigationRouter);
app.use("/api/myRequests", myRequests);
app.use("/api/myReports", myReports);
app.use("/api/SystemSettings", SystemSettings);
app.use("/api/manageRequests", manageRequestsRoutes);
app.use("/api/UsersManagement", UsersManagement);
app.use("/api/ManageGuidances", ManageGuidances);
app.use("/api/myGuidances", myGuidances);
app.use("/api/ManageGroups", manageGroupsRouter);
app.use("/api/updateGroup", updateGroup);
app.use("/api/FieldReports", fieldReportsRouter);
app.use("/api/CreateTaskModal", CreateTaskModal);



/* ==========================================================
   404
========================================================== */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ==========================================================
   start server
========================================================== */
app.listen(3001, () => {
  console.log("Server running on port 3001");
});
