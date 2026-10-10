// Role rules mirrored from the backend (see qms-server/src/routes).
export const canEdit = (user) => user?.role === "ADMIN" || user?.role === "USER";
export const canDelete = (user) => user?.role === "ADMIN";
export const isAdmin = (user) => user?.role === "ADMIN";

export const ROLE_LABELS = {
  ADMIN: "Admin",
  USER: "User",
  GUEST: "Guest",
};

export const ROLE_DESCRIPTIONS = {
  ADMIN: "Compliance Manager",
  USER: "Engineer",
  GUEST: "Audit Guest",
};
