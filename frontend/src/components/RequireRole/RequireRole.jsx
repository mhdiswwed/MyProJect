import { Navigate, useLocation } from "react-router-dom";

/**===========================================================================
 RequireRole
קומפוננטת הגנה לפי תפקידים – מוודאת שהמשתמש מחובר ושיש לו הרשאה מתאימה, אחרת מפנה ללוגין או לדף הבית
 =============================================================================*/
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
