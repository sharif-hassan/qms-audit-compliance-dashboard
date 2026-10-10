export const APP_NAME = "QMS Compliance";

// App mark (shield + check) with the product name beside it.
export default function Logo({ size = 32, showName = true, className }) {
  return (
    <span className={`logo${className ? ` ${className}` : ""}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="7" fill="var(--accent)" />
        <path d="M16 6.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M12.3 16.2l2.6 2.6 4.9-5.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showName && <span className="logo__name" style={{ fontSize: size * 0.5 }}>{APP_NAME}</span>}
    </span>
  );
}
