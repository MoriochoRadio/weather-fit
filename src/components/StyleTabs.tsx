import type { StyleId } from '../types';
import { STYLE_LABELS, STYLE_ORDER } from '../data/outfits';

interface Props {
  active: StyleId;
  onChange: (style: StyleId) => void;
}

export default function StyleTabs({ active, onChange }: Props) {
  return (
    <div className="tabs" role="tablist" aria-label="스타일 카테고리">
      {STYLE_ORDER.map((id) => (
        <button
          key={id}
          role="tab"
          aria-selected={active === id}
          className={active === id ? 'tab active' : 'tab'}
          onClick={() => onChange(id)}
        >
          {STYLE_LABELS[id]}
        </button>
      ))}
    </div>
  );
}
