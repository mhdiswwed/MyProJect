import { Navigate, useLocation } from "react-router-dom";

/**
 * קומפוננטת הגנה לפי תפקידים
 */
export default function RequireRole({ user, allowedRoles, children }) {
  const location = useLocation();

  // אם לא מחובר
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // אם אין הרשאה
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
