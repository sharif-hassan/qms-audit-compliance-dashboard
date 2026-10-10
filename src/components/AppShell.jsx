import { Suspense } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Icon from "./ui/Icon";
import Logo, { APP_NAME } from "./ui/Logo";
import { EmptyState } from "./ui/primitives";
import { useGlobal } from "../state/context";
import { allStandards } from "../standards";
import { canEdit, isAdmin, ROLE_DESCRIPTIONS } from "../permissions";
import { initials } from "../utils/format";

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`} title={label}>
      <Icon name={icon} size={16} />
      <span>{label}</span>
    </NavLink>
  );
}

// Sidebar layout wrapping every page except Landing and Login.
export default function AppShell() {
  const { user, customStandards, logout } = useGlobal();
  const navigate = useNavigate();

  const signOut = () => {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    logout();
    navigate("/login");
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="sidebar__brand" aria-label={`${APP_NAME} home`}>
          <Logo size={28} />
        </Link>

        <nav aria-label="Main">
          <div className="sidebar__section">
            <NavItem to="/" icon="home" label="Home" end />
          </div>

          <div className="sidebar__section">
            <div className="sidebar__heading">Standards</div>
            {allStandards(customStandards).map((s) => (
              <NavItem key={s.id} to={s.path} icon={s.icon} label={s.name} />
            ))}
            {canEdit(user) && <NavItem to="/custom-upload" icon="plus" label="Add Standard" />}
          </div>

          {canEdit(user) && (
            <div className="sidebar__section">
              <div className="sidebar__heading">Audit</div>
              <NavItem to="/evidence" icon="upload" label="Evidence" />
              <NavItem to="/files" icon="folder" label="Files" />
              {isAdmin(user) && <NavItem to="/users" icon="users" label="Users" />}
              {isAdmin(user) && <NavItem to="/changelog" icon="history" label="Change Log" />}
            </div>
          )}

          <div className="sidebar__section">
            <button type="button" className="nav-item" onClick={signOut} title="Sign out">
              <Icon name="logout" size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </nav>

        <div className="sidebar__user">
          <div className="avatar" aria-hidden="true">{initials(user?.name || user?.email)}</div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar__user-name">{user?.name || user?.email}</div>
            <div className="sidebar__user-role">{ROLE_DESCRIPTIONS[user?.role] ?? user?.role}</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <Suspense fallback={<EmptyState>Loading…</EmptyState>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
