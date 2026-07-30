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
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'unsupported'>('idle');
  const glossary = useMemo(() => findGlossary(outfit.items), [outfit]);

  const flashState = (next: 'copied' | 'unsupported') => {
    setShareState(next);
    setTimeout(() => setShareState('idle'), 2000);
  };

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
        flashState('copied');
      } catch {
        // 클립보드 권한이 없는 등 — 실패했다는 걸 알려준다 (QA: 무반응 방지)
        flashState('unsupported');
      }
      return;
    }
    // Web Share·클립보드 둘 다 없는 환경(비보안 컨텍스트, 구형 브라우저 등) — 조용히 실패하지 않고 알린다 (QA)
    flashState('unsupported');
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
          {shareState === 'copied' ? '복사됨' : shareState === 'unsupported' ? '공유 불가' : '공유'}
        </button>
        {/* 버튼 라벨 변경만으론 스크린리더에 안정적으로 전달되지 않아 별도 라이브 리전으로 알림 (QA) */}
        <span className="sr-only" role="status">
          {shareState === 'copied'
            ? '코디 내용이 클립보드에 복사됐어요'
            : shareState === 'unsupported'
              ? '이 브라우저에서는 공유를 지원하지 않아요'
              : ''}
        </span>
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
