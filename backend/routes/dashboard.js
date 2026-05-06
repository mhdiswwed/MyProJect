/*
dashboard.js
 ראוטר ללוח בקרה שולף כל המידע שצריך להציג אותו בלוח בקרה 
כולל סינון לפי טווח תאריכים
*/

const express = require("express");
const router = express.Router();
const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();

/* ======================================================
   פונקציית עזר לסינון תאריכים
====================================================== */

function hasDateFilter(fromDate, toDate) {
  return fromDate && toDate;
}

/* ======================================================
   סטטיסטיקות
====================================================== */

// סה"כ בקשות
async function getTotalRequests(fromDate, toDate) {
  let query = `
    SELECT COUNT(*) AS total
    FROM trip_requests
  `;

  let values = [];

  if (hasDateFilter(fromDate, toDate)) {
    query += `
      WHERE DATE(created_at) BETWEEN ? AND ?
    `;

    values.push(fromDate, toDate);
  }

  const [rows] = await db.promise().query(query, values);

  return rows[0].total;
}

// בקשות ממתינות
async function getPendingRequests(fromDate, toDate) {
  let query = `
    SELECT COUNT(*) AS total
    FROM trip_requests
    WHERE status = 'ממתין'
  `;

  let values = [];

  if (hasDateFilter(fromDate, toDate)) {
    query += `
      AND DATE(created_at) BETWEEN ? AND ?
    `;

    values.push(fromDate, toDate);
  }

  const [rows] = await db.promise().query(query, values);

  return rows[0].total;
}

// קבוצות פעילות
async function getActiveGroups(fromDate, toDate) {
  let query = `
    SELECT COUNT(*) AS total
    FROM groups
    WHERE status = 'פעיל'
  `;

  let values = [];

  if (hasDateFilter(fromDate, toDate)) {
    query += `
      AND DATE(created_at) BETWEEN ? AND ?
    `;

    values.push(fromDate, toDate);
  }

  const [rows] = await db.promise().query(query, values);

  return rows[0].total;
}

// משימות פתוחות
async function getOpenTasksCount(fromDate, toDate) {
  let query = `
    SELECT COUNT(*) AS total
    FROM tasks
    WHERE status = 'פתוחה'
  `;

  let values = [];

  if (hasDateFilter(fromDate, toDate)) {
    query += `
      AND DATE(created_at) BETWEEN ? AND ?
    `;

    values.push(fromDate, toDate);
  }

  const [rows] = await db.promise().query(query, values);

  return rows[0].total;
}

/* ======================================================
   בקשות אחרונות
====================================================== */

async function getLatestRequests(fromDate, toDate) {
  let query = `
    SELECT 
      tr.request_id,
      tr.status,
      tr.created_at,
      t.trail_name,
      u.full_name
    FROM trip_requests tr
    JOIN trails t 
      ON tr.trail_id = t.trail_id
    JOIN users u 
      ON tr.user_id = u.user_id
  `;

  let values = [];

  if (hasDateFilter(fromDate, toDate)) {
    query += `
      WHERE DATE(tr.created_at) BETWEEN ? AND ?
    `;

    values.push(fromDate, toDate);
  } else {
    query += `
      WHERE tr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
  }

  query += `
    ORDER BY tr.created_at DESC
  `;

  const [rows] = await db.promise().query(query, values);

  return rows;
}

/* ======================================================
   משימות קרובות
====================================================== */

async function getUpcomingTasks(fromDate, toDate) {
  let query = `
    SELECT 
      task_id,
      description,
      status,
      start_time,
      task_type
    FROM tasks
  `;

  let values = [];

  if (hasDateFilter(fromDate, toDate)) {
    query += `
      WHERE DATE(start_time) BETWEEN ? AND ?
    `;

    values.push(fromDate, toDate);
  } else {
    query += `
      WHERE start_time >= NOW()
      AND start_time <= DATE_ADD(NOW(), INTERVAL 2 DAY)
    `;
  }

  query += `
    ORDER BY start_time ASC
  `;

  const [rows] = await db.promise().query(query, values);

  return rows;
}

/* ======================================================
   דיווחים
====================================================== */
// מחזיר דיווחים לפי תאריכים
async function getNewReports(fromDate, toDate) {

  let query = `
    SELECT
      r.report_id,
      r.description,
      r.status,
      r.report_time,
      r.problem_type,
      r.image_path,
      t.trail_name
    FROM reports r
    LEFT JOIN trails t 
      ON r.trail_id = t.trail_id
  `;

  let values = [];

  // סינון לפי תאריכים
  if (fromDate && toDate) {
    query += `
      WHERE DATE(r.report_time) BETWEEN ? AND ?
    `;
    values.push(fromDate, toDate);
  }

  query += `
    ORDER BY r.report_time DESC
  `;

  const [rows] = await db.promise().query(
    query,
    values
  );

  return rows;
}


/* ======================================================
   גרף בקשות לפי ימים
====================================================== */

async function getRequestsChart(fromDate, toDate) {
  let query = `
    SELECT 
      DATE(created_at) AS date,
      COUNT(*) AS count
    FROM trip_requests
  `;

  let values = [];

  if (hasDateFilter(fromDate, toDate)) {
    query += `
      WHERE DATE(created_at) BETWEEN ? AND ?
    `;

    values.push(fromDate, toDate);
  } else {
    query += `
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
  }

  query += `
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  const [rows] = await db.promise().query(query, values);

  return rows;
}

/* ======================================================
   גרף דיווחים לפי ימים
====================================================== */

async function getReportsChart(fromDate, toDate) {
  let query = `
    SELECT 
      DATE(report_time) AS date,
      COUNT(*) AS count
    FROM reports
  `;

  let values = [];

  if (hasDateFilter(fromDate, toDate)) {
    query += `
      WHERE DATE(report_time) BETWEEN ? AND ?
    `;

    values.push(fromDate, toDate);
  } else {
    query += `
      WHERE report_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
  }

  query += `
    GROUP BY DATE(report_time)
    ORDER BY date ASC
  `;

  const [rows] = await db.promise().query(query, values);

  return rows;
}

/* ======================================================
   סטטוסים של בקשות
====================================================== */

async function getStatusData(fromDate, toDate) {
  let query = `
    SELECT 
      status,
      COUNT(*) AS count
    FROM trip_requests
  `;

  let values = [];

  if (hasDateFilter(fromDate, toDate)) {
    query += `
      WHERE DATE(created_at) BETWEEN ? AND ?
    `;

    values.push(fromDate, toDate);
  }

  query += `
    GROUP BY status
  `;

  const [rows] = await db.promise().query(query, values);

  return rows;
}

/* ======================================================
   API ראשי של הדשבורד
====================================================== */

router.get("/", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const totalRequests =
      await getTotalRequests(fromDate, toDate);

    const pendingRequests =
      await getPendingRequests(fromDate, toDate);

    const activeGroups =
      await getActiveGroups(fromDate, toDate);

    const openTasks =
      await getOpenTasksCount(fromDate, toDate);

    const latestRequests =
      await getLatestRequests(fromDate, toDate);

    const tasks =
      await getUpcomingTasks(fromDate, toDate);

    const reports =
      await getNewReports(fromDate, toDate);

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

    res.status(500).json({
      error: "שגיאה בשרת",
    });
  }
});

/* ======================================================
   API גרפים
====================================================== */

router.get("/charts", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const requestsChart =
      await getRequestsChart(fromDate, toDate);

    const reportsChart =
      await getReportsChart(fromDate, toDate);

    const statusData =
      await getStatusData(fromDate, toDate);

    res.json({
      requestsChart,
      reportsChart,
      statusData,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "שגיאה בשרת",
    });
  }
});

module.exports = router;