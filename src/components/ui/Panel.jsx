// Card with the black header strip + red accent used throughout the app.
export default function Panel({ title, meta, footer, flush, className, children }) {
  return (
    <section className={`panel${className ? ` ${className}` : ""}`}>
      {(title || meta) && (
        <header className="panel__header">
          {title && <span className="panel__title">{title}</span>}
          {meta && <span className="panel__meta">{meta}</span>}
        </header>
      )}
      {flush ? children : <div className="panel__body">{children}</div>}
      {footer !== undefined && (
        <footer className="panel__footer">
          <span>{footer}</span>
        </footer>
      )}
    </section>
  );
}
