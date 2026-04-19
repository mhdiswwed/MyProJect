/**
 * ------------------------------------------------
 * קומפוננטה: ChartsSection
 * ------------------------------------------------
 * תיאור:
 * מציגה 3 גרפים בלוח הבקרה:
 * 1. בקשות לפי ימים
 * 2. דיווחים לפי ימים
 * 3. סטטוס בקשות (דונאט)
 *
 * הנתונים נשלפים מצד השרת.
 */

import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import styles from "./chartsSection.module.css";
import API_BASE from "../../../config/api";

export default function ChartsSection() {
  /* =========================
     נתונים לגרפים
  ========================= */
  const [requestsData, setRequestsData] = useState([]);
  const [reportsData, setReportsData] = useState([]);
  const [statusData, setStatusData] = useState([]);

  /* =========================
     טעינת נתונים מהשרת
  ========================= */
  useEffect(() => {
    loadChartsData();
  }, []);

  async function loadChartsData() {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/charts`);
      const data = await res.json();

      setRequestsData(formatDateLabels(data.requestsChart || []));
      setReportsData(formatDateLabels(data.reportsChart || []));
      setStatusData(data.statusData || []);
    } catch (error) {
      console.error("שגיאה בטעינת גרפים:", error);
    }
  }

  /**
   * =========================================
   * המרת תאריך לפורמט קצר ויפה
   * לדוגמה: 08/04
   * =========================================
   */
  function formatDateLabels(arr) {
    return arr.map((item) => ({
      ...item,
      shortDate: new Date(item.date).toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
      }),
    }));
  }

  /* =========================
     גרף 1 - בקשות לפי ימים
  ========================= */
  const requestsChartOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      background: "transparent",
      foreColor: "#cbd5e1",
    },
    theme: {
      mode: "dark",
    },
    plotOptions: {
      bar: {
        borderRadius: 10,
        columnWidth: "48%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: "rgba(255,255,255,0.07)",
      strokeDashArray: 4,
    },
    xaxis: {
      categories: requestsData.map((item) => item.shortDate),
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "12px",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "12px",
        },
      },
    },
    tooltip: {
      theme: "dark",
    },
    colors: ["#3b82f6"],
    legend: {
      show: false,
    },
  };

  const requestsChartSeries = [
    {
      name: "בקשות",
      data: requestsData.map((item) => item.count),
    },
  ];

  /* =========================
     גרף 2 - דיווחים לפי ימים
  ========================= */
  const reportsChartOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      background: "transparent",
      foreColor: "#cbd5e1",
    },
    theme: {
      mode: "dark",
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.03,
        stops: [0, 90, 100],
      },
    },
    grid: {
      borderColor: "rgba(255,255,255,0.07)",
      strokeDashArray: 4,
    },
    xaxis: {
      categories: reportsData.map((item) => item.shortDate),
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "12px",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "12px",
        },
      },
    },
    tooltip: {
      theme: "dark",
    },
    colors: ["#10b981"],
    legend: {
      show: false,
    },
    markers: {
      size: 4,
      strokeWidth: 0,
      hover: {
        size: 6,
      },
    },
  };

  const reportsChartSeries = [
    {
      name: "דיווחים",
      data: reportsData.map((item) => item.count),
    },
  ];

  /* =========================
     גרף 3 - סטטוס בקשות
  ========================= */
  const statusColorMap = {
    ממתין: "#facc15",
    מאושר: "#22c55e",
    נדחה: "#ef4444",
    מבוטל: " #6b7280",
    "מבקש ביטול": "#3b82f6",
  };
  const statusChartOptions = {
    chart: {
      type: "donut",
      background: "transparent",
      foreColor: "#cbd5e1",
    },
    theme: {
      mode: "dark",
    },
    labels: statusData.map((item) => item.status),
    legend: {
      position: "bottom",
      fontSize: "13px",
      labels: {
        colors: "#cbd5e1",
      },
      itemMargin: {
        horizontal: 10,
        vertical: 6,
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "12px",
        fontWeight: "600",
      },
      dropShadow: {
        enabled: false,
      },
    },
    stroke: {
      width: 0,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            name: {
              show: true,
              color: "#94a3b8",
              fontSize: "13px",
            },
            value: {
              show: true,
              color: "#ffffff",
              fontSize: "22px",
              fontWeight: 700,
            },
            total: {
              show: true,
              label: "סה״כ",
              color: "#94a3b8",
              formatter: function () {
                return statusData.reduce(
                  (sum, item) => sum + Number(item.count || 0),
                  0,
                );
              },
            },
          },
        },
      },
    },
    tooltip: {
      theme: "dark",
    },
   colors :statusData.map(
    (item) => statusColorMap[item.status] ||"#999"
   )
  };

  const statusChartSeries = statusData.map((item) => Number(item.count || 0));

  return (
    <div className={styles.container}>
      {/* =========================
         גרף בקשות
      ========================= */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>בקשות לפי ימים</h3>
          <span className={styles.cardSubTitle}>7 ימים אחרונים</span>
        </div>

        <div className={styles.chartWrapper}>
          <Chart
            options={requestsChartOptions}
            series={requestsChartSeries}
            type="bar"
            height={280}
          />
        </div>
      </div>

      {/* =========================
         גרף דיווחים
      ========================= */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>דיווחים לפי ימים</h3>
          <span className={styles.cardSubTitle}>7 ימים אחרונים</span>
        </div>

        <div className={styles.chartWrapper}>
          <Chart
            options={reportsChartOptions}
            series={reportsChartSeries}
            type="area"
            height={280}
          />
        </div>
      </div>

      {/* =========================
         גרף סטטוסים
      ========================= */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>סטטוס בקשות</h3>
          <span className={styles.cardSubTitle}>התפלגות כללית</span>
        </div>

        <div className={styles.chartWrapper}>
          <Chart
            options={statusChartOptions}
            series={statusChartSeries}
            type="donut"
            height={280}
          />
        </div>
      </div>
    </div>
  );
}
