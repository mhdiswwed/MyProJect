import styles from "./requestsAndTasks.module.css";

export default function RequestsAndTasks({ requests = [], tasks = [] }) {
  return (
    <div className={styles.container}>
      {/* ===== משימות ===== */}
      <div className={styles.box}>
        <h3>משימות קרובות</h3>

        {tasks.length === 0 ? (
          <p>אין משימות</p>
        ) : (
          tasks.map((t) => (
            <div key={t.task_id} className={styles.item}>
              {/* תיאור משימה */}
              {t.description} - {t.status}
            </div>
          ))
        )}
      </div>

      {/* ===== בקשות ===== */}
      <div className={styles.box}>
        <h3>בקשות אחרונות</h3>

        {requests.length === 0 ? (
          <p>אין בקשות</p>
        ) : (
          requests.map((r) => (
            <div key={r.request_id} className={styles.item}>
              {/* שם מסלול + סטטוס */}
              {r.trail_name} - {r.status}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
