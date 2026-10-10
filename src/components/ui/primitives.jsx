import Icon from "./Icon";
import { splitList } from "../../utils/format";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export function Button({ variant = "primary", size, block, icon, className, children, type = "button", ...props }) {
  return (
    <button
      type={type}
      className={cx("btn", `btn--${variant}`, size && `btn--${size}`, block && "btn--block", className)}
      {...props}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 12 : 14} strokeWidth={2.5} />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, size = 14, className, ...props }) {
  return (
    <button type="button" className={cx("icon-btn", className)} title={label} aria-label={label} {...props}>
      <Icon name={icon} size={size} strokeWidth={2.2} />
    </button>
  );
}

export function Tag({ tone = "accent", round, className, children, ...props }) {
  return (
    <span className={cx("tag", `tag--${tone}`, round && "tag--round", className)} {...props}>
      {children}
    </span>
  );
}

// Renders a comma-separated value ("9001, 27001") as a row of tags.
export function TagList({ value, tone = "accent", round = true }) {
  const items = splitList(value);
  if (items.length === 0) return null;
  return (
    <div className="tag-list">
      {items.map((item, i) => <Tag key={i} tone={tone} round={round}>{item}</Tag>)}
    </div>
  );
}

export function CountPill({ children }) {
  return <span className="count-pill">{children}</span>;
}

export function Alert({ tone = "error", children }) {
  const icon = tone === "success" ? "check" : "alert";
  return (
    <div className={`alert alert--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={icon} size={15} strokeWidth={2.5} />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ boxed, children }) {
  return <div className={cx("empty", boxed && "empty--boxed")}>{children}</div>;
}

export function SearchInput({ value, onChange, placeholder = "Search…", label = "Search", className }) {
  return (
    <div className={cx("search", className)}>
      <Icon name="search" size={15} strokeWidth={2.5} />
      <input
        type="search"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}

export function Field({ label, children, style }) {
  return (
    <label className="field" style={style}>
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}
