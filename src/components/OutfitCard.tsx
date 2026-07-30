import { useMemo, useState } from 'react';
import type { Recommendation } from '../engine/recommend';
import { findGlossary } from '../data/glossary';
import ItemIcon from './ItemIcon';
import OutfitSilhouette from './OutfitSilhouette';

interface Props {
  rec: Recommendation;
  index: number;
  /** 카드 번호 접두어 — 본 추천은 LOOK, 대안 코디는 ALT */
  prefix?: string;
  saved?: boolean;
  onToggleSave?: (outfitId: string) => void;
}

const ITEM_LABELS: Array<[keyof Recommendation['outfit']['items'], string]> = [
  ['outer', '아우터'],
  ['top', '상의'],
  ['bottom', '하의'],
  ['shoes', '신발'],
  ['acc', '액세서리'],
];

/** 코디를 텍스트로 정리해 Web Share API(지원 안 하면 클립보드)로 공유한다 (FR-27) */
function shareText(outfit: Recommendation['outfit']): string {
  const { items } = outfit;
  const lines = [`WeatherFit — ${outfit.name}`];
  if (items.outer) lines.push(`아우터: ${items.outer}`);
  lines.push(`상의: ${items.top}`, `하의: ${items.bottom}`, `신발: ${items.shoes}`);
  if (items.acc) lines.push(`액세서리: ${items.acc}`);
  lines.push('', outfit.tip);
  return lines.join('\n');
}

export default function OutfitCard({ rec, index, prefix = 'LOOK', saved, onToggleSave }: Props) {
  const { outfit, rainWarning } = rec;
  const [showGlossary, setShowGlossary] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const glossary = useMemo(() => findGlossary(outfit.items), [outfit]);

  const handleShare = async () => {
    const text = shareText(outfit);
    if (navigator.share) {
      try {
        await navigator.share({ title: outfit.name, text });
      } catch {
        // 사용자가 공유 시트를 취소한 경우 등 — 무시
      }
      return;
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setShareState('copied');
        setTimeout(() => setShareState('idle'), 2000);
      } catch {
        // 클립보드 권한이 없는 등 — 조용히 무시
      }
    }
  };

  return (
    <article className="outfit">
      <header className="outfit-head">
        <span className="outfit-no">
          {prefix} {String(index + 1).padStart(2, '0')}
          {outfit.tone === 'warm' && <span className="outfit-tone">웜톤</span>}
        </span>
        <div className="outfit-head-actions">
          {rainWarning && <span className="outfit-warn">우천 주의 소재</span>}
          {onToggleSave && (
            <button
              type="button"
              className={saved ? 'outfit-save active' : 'outfit-save'}
              aria-pressed={!!saved}
              aria-label={saved ? '즐겨찾는 코디에서 빼기' : '즐겨찾는 코디에 담기'}
              onClick={() => onToggleSave(outfit.id)}
            >
              {saved ? '★' : '☆'}
            </button>
          )}
        </div>
      </header>
      <h3 className="outfit-name">{outfit.name}</h3>
      <div className="outfit-visual">
        <OutfitSilhouette items={outfit.items} />
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
      </div>
      <p className="outfit-point">
        <span className="outfit-point-label">포인트</span> {outfit.point}
      </p>
      <p className="outfit-tip">{outfit.tip}</p>
      <div className="outfit-actions">
        <button type="button" className="text-btn" onClick={handleShare}>
          {shareState === 'copied' ? '복사됨' : '공유'}
        </button>
      </div>
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
