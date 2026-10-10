import { Navigate } from "react-router-dom";
import { useGlobal } from "../state/context";

// Renders children only for users whose role is in allowedRoles.
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useGlobal();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
