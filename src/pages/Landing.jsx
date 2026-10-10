import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/ui/Icon";
import Logo from "../components/ui/Logo";
import { Button } from "../components/ui/primitives";
import { useGlobal } from "../state/context";
import { allStandards } from "../standards";
import { canEdit, isAdmin } from "../permissions";

function LandingCard({ to, icon, title }) {
  return (
    <Link to={to} className="landing-card">
      <span className="landing-card__icon"><Icon name={icon} size={16} /></span>
      <span className="landing-card__title">{title}</span>
      <Icon name="chevronRight" size={16} className="landing-card__chevron" />
    </Link>
  );
}

export default function Landing() {
  const { user, customStandards, logout } = useGlobal();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="landing">
      <div className="landing__brand">
        <Logo size={44} className="landing__logo" />
        <h1 className="landing__title">
          Quality<br />Management<br /><span>System</span>
        </h1>
        <p className="landing__tagline">Audit checklists, evidence tracking,<br />and compliance management.</p>
      </div>

      <nav className="landing__nav" aria-label="Main">
        <div className="landing__user">
          <span>Signed in as {user?.name || user?.email}</span>
          <Button variant="on-dark" size="sm" icon="logout" onClick={signOut}>Sign out</Button>
        </div>

        <div className="landing__group">
          <div className="landing__heading">Standards</div>
          <div className="landing__cards">
            {allStandards(customStandards).map((s) => (
              <LandingCard key={s.id} to={s.path} icon={s.icon} title={s.name} />
            ))}
            {canEdit(user) && <LandingCard to="/custom-upload" icon="plus" title="Upload Custom Standard" />}
          </div>
        </div>

        {canEdit(user) && (
          <div className="landing__group">
            <div className="landing__heading">Audit</div>
            <div className="landing__cards">
              <LandingCard to="/evidence" icon="upload" title="Evidence" />
              <LandingCard to="/files" icon="folder" title="Files" />
              {isAdmin(user) && <LandingCard to="/users" icon="users" title="Users" />}
              {isAdmin(user) && <LandingCard to="/changelog" icon="history" title="Change Log" />}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
