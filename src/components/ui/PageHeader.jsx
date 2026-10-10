import { useEffect } from "react";
import { APP_NAME } from "./Logo";

export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);

  return (
    <header className="page-header">
      <div className="page-header__row">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}
