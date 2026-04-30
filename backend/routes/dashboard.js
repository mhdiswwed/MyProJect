/*
dashboard.js
 ראוטר ללוח בקרה שולף כל המידע שצריך להציג אותו בלוח בקרה */

const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");

// Execute a query to the database
const db = dbSingleton.getConnection();

// ראוטר אחד שמחזיר את כל הדשבורד
router.get("/", async (req, res) => {
  try {
    // שימוש ב־promise wrapper
    // כמות לפי סטטוסים בלוח בקרה למעלה
    const [requestsCount] = await db
      .promise()
      .query("SELECT COUNT(*) AS total FROM trip_requests");

    const [pendingRequests] = await db
      .promise()
      .query(
        "SELECT COUNT(*) AS total FROM trip_requests WHERE status = 'ממתין'",
      );

    const [activeGroups] = await db
      .promise()
      .query("SELECT COUNT(*) AS total FROM groups WHERE status = 'פעיל'");

    const [openTasks] = await db
      .promise()
      .query("SELECT COUNT(*) AS total FROM tasks WHERE status = 'פתוחה'");

    //בקשות אחרונות 7 ימים אחרונים
    const [latestRequests] = await db.promise().query(`
    SELECT 
  tr.request_id,
  tr.status,
  tr.created_at,
  t.trail_name,
  u.full_name
FROM trip_requests tr
JOIN trails t ON tr.trail_id = t.trail_id
JOIN users u ON tr.user_id = u.user_id
WHERE tr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY tr.created_at DESC
    `);
    //משימות קרובות 2 ימים אחרונים
    const [tasks] = await db.promise().query(`
  SELECT 
  task_id,
  description,
  status,
  start_time,
  task_type
FROM tasks
WHERE start_time >= NOW() 
AND start_time <= DATE_ADD(NOW(), INTERVAL 2 DAY)
ORDER BY start_time ASC
    `);

    //דיווחים חדשים,
    const [reports] = await db.promise().query(`
  SELECT
    r.report_id,
    r.description,
    r.status,
    r.report_time,
    r.problem_type,
    r.image_path,
    t.trail_name
  FROM reports r
  LEFT JOIN trails t ON r.trail_id = t.trail_id
  WHERE r.status = 'חדש'
  ORDER BY r.report_time DESC
`);

    res.json({
      stats: {
        totalRequests: requestsCount[0].total,
        pendingRequests: pendingRequests[0].total,
        activeGroups: activeGroups[0].total,
        openTasks: openTasks[0].total,
      },
      latestRequests,
      tasks,
      reports,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

/** שולפת 3 גרפים בלוח הבקרה:
 * 1. בקשות לפי ימים
 * 2. דיווחים לפי ימים
 * 3. סטטוס בקשות (דונאט)
 * */
router.get("/charts", async (req, res) => {
  try {
    // גרף בקשות לפי ימים (7 ימים אחרונים)
    const [requestsChart] = await db.promise().query(`
      SELECT 
        DATE(created_at) AS date,
        COUNT(*) AS count
      FROM trip_requests
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // גרף דיווחים לפי ימים
    const [reportsChart] = await db.promise().query(`
      SELECT 
        DATE(report_time) AS date,
        COUNT(*) AS count
      FROM reports
      WHERE report_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(report_time)
      ORDER BY date
    `);

    // סטטוסים של בקשות
    const [statusData] = await db.promise().query(`
  SELECT status, COUNT(*) as count
  FROM trip_requests
  GROUP BY status
`);
    res.json({
      requestsChart,
      reportsChart,
      statusData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "שגיאה בשרת" });
  }
});

module.exports = router;
