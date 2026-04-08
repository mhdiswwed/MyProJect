import styles from "./reportsTable.module.css";

export default function ReportsTable({ reports = [] }) {
  return (
    <div className={styles.tableBox}>
      <h3>דיווחים</h3>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>תיאור</th>
            <th>סוג</th>
            <th>תאריך</th>
            <th>סטטוס</th>
          </tr>
        </thead>

        <tbody>
          {reports.length === 0 ? (
            <tr>
              <td colSpan="4">אין דיווחים</td>
            </tr>
          ) : (
            reports.map((r) => (
              <tr key={r.report_id}>
                {/* תיאור הבעיה */}
                <td>{r.description}</td>

                {/* סוג הבעיה */}
                <td>{r.problem_type}</td>

                {/* תאריך */}
                <td>{r.report_time?.split("T")[0]}</td>

                {/* סטטוס */}
                <td>{r.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
