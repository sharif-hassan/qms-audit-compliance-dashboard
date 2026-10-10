import { splitListItems } from "../../utils/format";

// Shows requirement text with any "a) … b) …" run split into a list.
export default function FormattedText({ text }) {
  const { intro, items } = splitListItems(text);
  if (items.length === 0) return <span className="inline-edit__value">{text}</span>;

  return (
    <div className="formatted-text">
      {intro && <div className="formatted-text__intro">{intro}</div>}
      <div className="formatted-text__list">
        {items.map((item, i) => (
          <div key={i} className="formatted-text__item">
            <span className="formatted-text__marker">{item.marker}</span>
            <span>{item.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
