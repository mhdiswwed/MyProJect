/**
------------------------------------------------
עמוד ניהול משתמשים
------------------------------------------------

תכונות:
- הצגת משתמשים בטבלה
- חיפוש לפי שם
- סינון לפי תפקיד וסטטוס
- עריכת משתמש
- חסימה / הפעלה
- מחיקה עם אישור
- הודעות מערכת (כמו ManageRequests)
*/

import { useEffect, useState } from "react";
import styles from "./usersManagement.module.css";
import API_BASE from "../../config/api";

import { FaEdit, FaTrash, FaLock, FaUnlock } from "react-icons/fa";
// Hook לשמירת חישוב (כמו סינון) כדי למנוע רינדור מיותר ולשפר ביצועים
import { useMemo } from "react";
export default function UsersManagement({ currentUser }) {
  /* =========================
     רשימת משתמשים
  ========================= */
  const [users, setUsers] = useState([]);

  /* =========================
     חיפוש
  ========================= */
  const [search, setSearch] = useState("");

  /* =========================
     פילטרים
  ========================= */
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  /* =========================
     מודאלים
  ========================= */
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // state שמכריח את React לעשות רינדור מחדש גם אם לוחצים על אותו כפתור
  const [activeBtn, setActiveBtn] = useState("");

  /* =========================
     הודעות מערכת (כמו אצלך)
  ========================= */
  const [msg, setMsg] = useState({ type: "", text: "" });

  /* =========================
     טופס עריכה
  ========================= */
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    role: "",
  });

  /* =========================
     טעינת משתמשים
  ========================= */
  useEffect(() => {
    fetch(`${API_BASE}/api/UsersManagement/users`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
        else setUsers([]);
      })
      .catch(() => setUsers([]));
  }, []);

  /* =========================
     ניקוי הודעה אחרי 3 שניות
  ========================= */
  /*
  useEffect(() => {
    if (!msg.text) return;

    const timer = setTimeout(() => {
      setMsg({ type: "", text: "" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [msg]);
*/
  /* =========================
     סינון
  ========================= */
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      /* חיפוש לפי שם */
      if (
        search &&
        !(u.full_name || "").toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      /* סינון לפי תפקיד */
      if (roleFilter !== "all") {
        if (roleFilter === "מנהל" && u.role !== "מנהל") return false;
        if (roleFilter === "מדריך" && u.role !== "מדריך") return false;
        if (roleFilter === "עובד" && u.role !== "עובד") return false;
        if (roleFilter === "נציג קבוצה" && u.role !== "נציג קבוצה")
          return false;
      }

      /* סינון לפי סטטוס */
      if (statusFilter !== "all") {
        if (statusFilter === "active" && Number(u.active) !== 1) return false;

        if (statusFilter === "blocked" && Number(u.active) !== 0) return false;
      }

      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  /* =========================
   פתיחת מודאל עריכה
========================= */
  function openEdit(user) {
    setMsg({ type: "", text: "" }); // ניקוי הודעות
    setSelectedUser(user);

    setForm({
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
    });

    setShowEditModal(true);
  }

  /* =========================
     שמירה עם בדיקות
  ========================= */
  function saveUser() {
    /* בדיקת טלפון */
    if (
      !form.phone ||
      form.phone.length !== 10 ||
      !form.phone.startsWith("05") ||
      isNaN(form.phone)
    ) {
      setMsg({
        type: "error",
        text: "מספר טלפון לא תקין",
      });
      return;
    }

    /* בדיקה שיש משתמש נבחר */
    if (!selectedUser) {
      setMsg({
        type: "error",
        text: "לא נבחר משתמש לעריכה",
      });
      return;
    }

    fetch(`${API_BASE}/api/UsersManagement/users/${selectedUser.user_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((res) => res.json())
      .then(() => {
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === selectedUser.user_id ? { ...u, ...form } : u,
          ),
        );

        setMsg({
          type: "success",
          text: "המשתמש עודכן בהצלחה",
        });

        // ⏱ נותן זמן לראות
        setTimeout(() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }, 2000); // 2 שניות
      })
      .catch(() => {
        setMsg({
          type: "error",
          text: "שגיאה בעדכון המשתמש",
        });
      });
  }

  /* =========================
     חסימה / הפעלה
  ========================= */
  function toggleStatus(user) {
    fetch(`${API_BASE}/api/UsersManagement/users/toggle/${user.user_id}`, {
      method: "PUT",
    }).then(() => {
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id ? { ...u, active: u.active ? 0 : 1 } : u,
        ),
      );
    });
  }

  /* =========================
     מחיקה
  ========================= */
  function deleteUser(id) {
    fetch(`${API_BASE}/api/UsersManagement/users/${id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        // ❌ אם יש שגיאה מהשרת (למשל קשרים בטבלאות)
        if (!data.message || data.message !== "נמחק") {
          setMsg({
            type: "error",
            text: data.message || "לא ניתן למחוק משתמש",
          });
          return;
        }

        // ✅ הצלחה
        setMsg({
          type: "success",
          text: "המשתמש נמחק בהצלחה",
        });

        // ⏱ נותן זמן לראות הודעה
        setTimeout(() => {
          setUsers((prev) => prev.filter((u) => u.user_id !== id));
          setConfirmDelete(null);
          setMsg({ type: "", text: "" }); // 🔥
        }, 2000);
      })
      .catch(() => {
        setMsg({
          type: "error",
          text: "שגיאה במחיקה",
        });
      });
  }

  /**
   * שינוי פילטר תפקיד
   * מאפס את פילטר הסטטוס כדי שהסינון יעבוד בנפרד
   */
  function changeRoleFilter(value) {
    setRoleFilter(value);
    setStatusFilter("all");
  }

  /**
   * שינוי פילטר סטטוס
   * מאפס את פילטר התפקיד כדי שהסינון יעבוד בנפרד
   */
  function changeStatusFilter(value) {
    setStatusFilter(value);
    setRoleFilter("all");
  }

  /**
------------------------------------------------
חישוב סטטיסטיקות משתמשים לפי תפקיד
------------------------------------------------
סופר:
- סך הכל משתמשים
- מנהלים
- מדריכים
- עובדי שטח
- נציגי קבוצה
*/
  const stats = users.reduce(
    (acc, u) => {
      // סך הכל
      acc.total++;

      /* =========================
       ספירת תפקידים
    ========================= */
      if (u.role === "מנהל") acc.admin++;
      else if (u.role === "מדריך") acc.guide++;
      else if (u.role === "עובד") acc.worker++;
      else if (u.role === "נציג קבוצה") acc.groupRep++;

      return acc;
    },
    {
      total: 0,
      admin: 0,
      guide: 0,
      worker: 0,
      groupRep: 0,
    },
  );


  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.topBar}>
        {/* סינון */}
        <div className={styles.filtersRow}>
          <h1 className={styles.title}>ניהול משתמשים</h1>

          <div className={styles.statsRow}>
            {/* סה"כ */}
            <div className={`${styles.statBox} ${styles.totalBox}`}>
              <div className={styles.statNumber}>{stats.total}</div>
              <div className={styles.statLabel}>סה״כ</div>
            </div>

            {/* מנהלים */}
            <div className={`${styles.statBox} ${styles.adminBox}`}>
              <div className={styles.statNumber}>{stats.admin}</div>
              <div className={styles.statLabel}>מנהלים</div>
            </div>

            {/* מדריכים */}
            <div className={`${styles.statBox} ${styles.guideBox}`}>
              <div className={styles.statNumber}>{stats.guide}</div>
              <div className={styles.statLabel}>מדריכים</div>
            </div>

            {/* עובדים */}
            <div className={`${styles.statBox} ${styles.workerBox}`}>
              <div className={styles.statNumber}>{stats.worker}</div>
              <div className={styles.statLabel}>עובדים</div>
            </div>

            {/* נציגי קבוצה */}
            <div className={`${styles.statBox} ${styles.groupRepBox}`}>
              <div className={styles.statNumber}>{stats.groupRep}</div>
              <div className={styles.statLabel}>נציגי קבוצה</div>
            </div>
            {/* סינון לפי תפקיד */}
            <div className={styles.filterBox}>
              {/* חיפוש */}
              <input
                className={styles.input}
                placeholder="חיפוש לפי שם..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className={styles.filterItem}>
                <label className={styles.filterLabel}>תפקיד:</label>

                <select
                  className={styles.filterSelect}
                  value={roleFilter}
                  onChange={(e) => changeRoleFilter(e.target.value)}
                >
                  <option value="all">הכל</option>
                  <option value="מנהל">מנהלים</option>
                  <option value="מדריך">מדריכים</option>
                  <option value="עובד">עובדי שטח</option>
                  <option value="נציג קבוצה">נציגי קבוצה</option>
                </select>
              </div>
              {/* סינון לפי סטטוס */}
              <div className={styles.filterItem}>
                <label className={styles.filterLabel}>סטטוס:</label>

                <select
                  className={styles.filterSelect}
                  value={statusFilter}
                  onChange={(e) => changeStatusFilter(e.target.value)}
                >
                  <option value="all">הכל</option>
                  <option value="active">פעילים</option>
                  <option value="blocked">חסומים</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.tableWrapper}>
        {/* טבלה */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>שם מלא</th>
              <th>אימייל</th>
              <th>טלפון</th>
              <th>תפקיד</th>
              <th>תאריך הצטרפות</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.user_id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                <td>{u.role}</td>
                <td>{new Date(u.created_at).toLocaleDateString("he-IL")}</td>
                <td>{u.active ? "פעיל" : "חסום"}</td>

                <td className={styles.actions}>
                  <button onClick={() => openEdit(u)}>
                    <FaEdit />
                  </button>

                  {u.user_id !== currentUser.user_id && (
                    <button onClick={() => toggleStatus(u)}>
                      {u.active ? <FaLock /> : <FaUnlock />}
                    </button>
                  )}

                  {u.user_id !== currentUser.user_id && (
                    <button
                      onClick={() => {
                        setMsg({ type: "", text: "" }); // 🔥
                        setConfirmDelete(u);
                      }}
                    >
                      <FaTrash />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* מודאל מחיקה */}
      {confirmDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <p>האם אתה בטוח שברצונך למחוק משתמש?</p>

            {/* 🔥 הודעה בתוך הפופאפ */}
            {msg.text && (
              <div
                className={`${styles.inlineMsg} ${
                  msg.type === "success"
                    ? styles.inlineSuccess
                    : styles.inlineError
                }`}
              >
                {msg.text}
              </div>
            )}
            <button
              className={styles.deleteBtn}
              onClick={() => deleteUser(confirmDelete.user_id)}
            >
              מחק
            </button>

            <button
              className={styles.close}
              onClick={() => setConfirmDelete(null)}
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* מודאל עריכה */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>עריכת משתמש</h2>

            <input
              className={styles.input}
              placeholder="שם מלא"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />

            <input
              className={styles.input}
              placeholder="טלפון"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />

            {/* הצגת תפקיד רק אם זה לא המשתמש המחובר */}
            {selectedUser?.user_id !== currentUser?.user_id && (
              <select
                className={styles.select}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="מנהל">מנהל</option>
                <option value="מדריך">מדריך</option>
                <option value="עובד">עובד</option>
                <option value="נציג קבוצה">נציג קבוצה</option>
              </select>
            )}

            {/* הודעות */}
            {msg.text && (
              <div
                className={`${styles.inlineMsg} ${
                  msg.type === "success"
                    ? styles.inlineSuccess
                    : styles.inlineError
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className={styles.modalActions}>
              <button className={styles.saveBtn} onClick={saveUser}>
                שמור
              </button>

              <button
                className={styles.closeBtn}
                onClick={() => setShowEditModal(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
