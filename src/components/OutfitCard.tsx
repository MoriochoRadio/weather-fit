import type { Recommendation } from '../engine/recommend';

interface Props {
  rec: Recommendation;
  index: number;
}

const ITEM_LABELS: Array<[keyof Recommendation['outfit']['items'], string]> = [
  ['outer', '아우터'],
  ['top', '상의'],
  ['bottom', '하의'],
  ['shoes', '신발'],
  ['acc', '액세서리'],
];

export default function OutfitCard({ rec, index }: Props) {
  const { outfit, rainWarning } = rec;
  return (
    <article className="outfit">
      <header className="outfit-head">
        <span className="outfit-no">LOOK {String(index + 1).padStart(2, '0')}</span>
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
              <dd>{value}</dd>
            </div>
          );
        })}
      </dl>
      <p className="outfit-tip">{outfit.tip}</p>
    </article>
  );
}
