import type { Recommendation } from '../engine/recommend';
import OutfitSilhouette from './OutfitSilhouette';
import ShareButton from './ShareButton';
import { GlossaryPanel, ItemList, PaletteStrip } from './OutfitParts';

export interface OutfitCardProps {
  rec: Recommendation;
  index: number;
  /** 카드 번호 접두어 — 본 추천은 LOOK, 대안 코디는 ALT */
  prefix?: string;
  saved?: boolean;
  onToggleSave?: (outfitId: string) => void;
  /** 오늘 이 코디를 입었다고 기록했는지 (FR-32) */
  worn?: boolean;
  onToggleWorn?: (outfitId: string) => void;
  /** 마지막으로 입은 날 — 최근에 입었으면 카드에 표시 (FR-32) */
  lastWorn?: string | null;
  /** 사용자가 "없다"고 표시해 둔 용어들 (FR-33) */
  missingTerms?: string[];
  onToggleMissingTerm?: (term: string) => void;
  /** "크게 보기" — 넘기면 카드에 버튼이 붙는다 (FR-37) */
  onOpen?: (outfitId: string) => void;
}

/** 며칠 전인지 — 기록이 오래됐으면 굳이 표시하지 않는다 */
function daysAgo(date: string): number | null {
  const t = Date.parse(`${date}T00:00:00`);
  if (Number.isNaN(t)) return null;
  const now = new Date();
  const today = Date.parse(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T00:00:00`,
  );
  return Math.round((today - t) / 86_400_000);
}

export default function OutfitCard({
  rec,
  index,
  prefix = 'LOOK',
  saved,
  onToggleSave,
  worn,
  onToggleWorn,
  lastWorn,
  missingTerms = [],
  onToggleMissingTerm,
  onOpen,
}: OutfitCardProps) {
  const { outfit, rainWarning } = rec;
  const wornGap = lastWorn ? daysAgo(lastWorn) : null;

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
      {wornGap !== null && wornGap > 0 && wornGap <= 14 && (
        <p className="outfit-worn-hint">{wornGap === 1 ? '어제' : `${wornGap}일 전`}에 입었어요</p>
      )}
      <div className="outfit-visual">
        <div className="outfit-figure">
          <OutfitSilhouette items={outfit.items} />
          <PaletteStrip palette={outfit.palette} />
        </div>
        <ItemList items={outfit.items} />
      </div>
      <p className="outfit-point">
        <span className="outfit-point-label">포인트</span> {outfit.point}
      </p>
      <p className="outfit-tip">{outfit.tip}</p>
      <div className="outfit-actions">
        {onOpen && (
          <button type="button" className="text-btn open-btn" onClick={() => onOpen(outfit.id)}>
            크게 보기
          </button>
        )}
        <ShareButton outfit={outfit} />
        {onToggleWorn && (
          <button
            type="button"
            className={worn ? 'text-btn worn active' : 'text-btn worn'}
            aria-pressed={!!worn}
            onClick={() => onToggleWorn(outfit.id)}
          >
            {worn ? '오늘 입음 ✓' : '오늘 입었어요'}
          </button>
        )}
      </div>
      <GlossaryPanel items={outfit.items} missingTerms={missingTerms} onToggleMissingTerm={onToggleMissingTerm} />
    </article>
  );
}
