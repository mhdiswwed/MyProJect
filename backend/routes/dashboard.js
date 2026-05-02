/*
dashboard.js
 ראוטר ללוח בקרה שולף כל המידע שצריך להציג אותו בלוח בקרה */

const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");

const db = dbSingleton.getConnection();

// מחזיר כמות כללית של בקשות
async function getTotalRequests() {
  const [rows] = await db
    .promise()
    .query("SELECT COUNT(*) AS total FROM trip_requests");
  return rows[0].total;
}

// מחזיר כמות בקשות ממתינות
async function getPendingRequests() {
  const [rows] = await db
    .promise()
    .query(
      "SELECT COUNT(*) AS total FROM trip_requests WHERE status = 'ממתין'",
    );
  return rows[0].total;
}

// מחזיר כמות קבוצות פעילות
async function getActiveGroups() {
  const [rows] = await db
    .promise()
    .query("SELECT COUNT(*) AS total FROM groups WHERE status = 'פעיל'");
  return rows[0].total;
}

// מחזיר כמות משימות פתוחות
async function getOpenTasksCount() {
  const [rows] = await db
    .promise()
    .query("SELECT COUNT(*) AS total FROM tasks WHERE status = 'פתוחה'");
  return rows[0].total;
}

// מחזיר בקשות אחרונות
async function getLatestRequests() {
  const [rows] = await db.promise().query(`
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
  return rows;
}

// מחזיר משימות קרובות
async function getUpcomingTasks() {
  const [rows] = await db.promise().query(`
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
  return rows;
}

// מחזיר דיווחים חדשים
async function getNewReports() {
  const [rows] = await db.promise().query(`
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
  return rows;
}

// מחזיר נתוני דשבורד
router.get("/", async (req, res) => {
  try {
    const totalRequests = await getTotalRequests();
    const pendingRequests = await getPendingRequests();
    const activeGroups = await getActiveGroups();
    const openTasks = await getOpenTasksCount();

    const latestRequests = await getLatestRequests();
    const tasks = await getUpcomingTasks();
    const reports = await getNewReports();

    res.json({
      stats: {
        totalRequests,
        pendingRequests,
        activeGroups,
        openTasks,
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

// מחזיר גרף בקשות לפי ימים
async function getRequestsChart() {
  const [rows] = await db.promise().query(`
    SELECT 
      DATE(created_at) AS date,
      COUNT(*) AS count
    FROM trip_requests
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date
  `);
  return rows;
}

// מחזיר גרף דיווחים לפי ימים
async function getReportsChart() {
  const [rows] = await db.promise().query(`
    SELECT 
      DATE(report_time) AS date,
      COUNT(*) AS count
    FROM reports
    WHERE report_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(report_time)
    ORDER BY date
  `);
  return rows;
}

// מחזיר סטטוסים של בקשות
async function getStatusData() {
  const [rows] = await db.promise().query(`
    SELECT status, COUNT(*) as count
    FROM trip_requests
    GROUP BY status
  `);
  return rows;
}

// מחזיר נתוני גרפים
router.get("/charts", async (req, res) => {
  try {
    const requestsChart = await getRequestsChart();
    const reportsChart = await getReportsChart();
    const statusData = await getStatusData();

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