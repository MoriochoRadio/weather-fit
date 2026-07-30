import type { KeyboardEvent } from 'react';
import { useRef } from 'react';
import type { StyleId } from '../types';
import { STYLE_LABELS, STYLE_ORDER } from '../data/outfits';

interface Props {
  active: StyleId;
  onChange: (style: StyleId) => void;
}

/** 탭 id — RegionPicker의 role="tabpanel"이 aria-labelledby로 참조한다 */
export function styleTabId(id: StyleId): string {
  return `style-tab-${id}`;
}

export default function StyleTabs({ active, onChange }: Props) {
  const buttonRefs = useRef<Partial<Record<StyleId, HTMLButtonElement | null>>>({});

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = STYLE_ORDER[(index + dir + STYLE_ORDER.length) % STYLE_ORDER.length];
    onChange(next);
    buttonRefs.current[next]?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label="스타일 카테고리">
      {STYLE_ORDER.map((id, index) => (
        <button
          key={id}
          ref={(el) => {
            buttonRefs.current[id] = el;
          }}
          id={styleTabId(id)}
          role="tab"
          aria-selected={active === id}
          aria-controls="outfit-panel"
          tabIndex={active === id ? 0 : -1}
          className={active === id ? 'tab active' : 'tab'}
          onClick={() => onChange(id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          {STYLE_LABELS[id]}
        </button>
      ))}
    </div>
  );
}
