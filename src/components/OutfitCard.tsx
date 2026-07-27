import { useMemo, useState } from 'react';
import type { Recommendation } from '../engine/recommend';
import { findGlossary } from '../data/glossary';
import ItemIcon from './ItemIcon';

interface Props {
  rec: Recommendation;
  index: number;
  /** 카드 번호 접두어 — 본 추천은 LOOK, 대안 코디는 ALT */
  prefix?: string;
}

const ITEM_LABELS: Array<[keyof Recommendation['outfit']['items'], string]> = [
  ['outer', '아우터'],
  ['top', '상의'],
  ['bottom', '하의'],
  ['shoes', '신발'],
  ['acc', '액세서리'],
];

export default function OutfitCard({ rec, index, prefix = 'LOOK' }: Props) {
  const { outfit, rainWarning } = rec;
  const [showGlossary, setShowGlossary] = useState(false);
  const glossary = useMemo(() => findGlossary(outfit.items), [outfit]);

  return (
    <article className="outfit">
      <header className="outfit-head">
        <span className="outfit-no">
          {prefix} {String(index + 1).padStart(2, '0')}
          {outfit.tone === 'warm' && <span className="outfit-tone">웜톤</span>}
        </span>
        {rainWarning && <span className="outfit-warn">우천 주의 소재</span>}
      </header>
      <h3 className="outfit-name">{outfit.name}</h3>
      <div className="outfit-palette" aria-label="코디 색상">
        {outfit.palette.map((c) => (
          <span key={c} className="swatch" style={{ backgroundColor: c }} />
        ))}
      </div>
      <dl className="outfit-items">
        {ITEM_LABELS.map(([key, label]) => {
          const value = outfit.items[key];
          if (!value) return null;
          return (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                <ItemIcon field={key} text={value} />
                <span>{value}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="outfit-point">
        <span className="outfit-point-label">포인트</span> {outfit.point}
      </p>
      <p className="outfit-tip">{outfit.tip}</p>
      {glossary.length > 0 && (
        <div className="glossary">
          <button
            type="button"
            className="glossary-toggle"
            aria-expanded={showGlossary}
            onClick={() => setShowGlossary((v) => !v)}
          >
            {showGlossary ? '풀이 접기' : `쉽게 풀이 · 대체 아이템 (${glossary.length})`}
          </button>
          {showGlossary && (
            <dl className="glossary-list">
              {glossary.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>
                    {g.meaning}
                    <span className="glossary-sub">없으면: {g.sub}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </article>
  );
}
