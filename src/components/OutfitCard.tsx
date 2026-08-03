import { useMemo, useState } from 'react';
import type { Recommendation } from '../engine/recommend';
import { findGlossary } from '../data/glossary';
import { renderOutfitPng } from '../services/shareImage';
import ItemIcon from './ItemIcon';
import OutfitSilhouette from './OutfitSilhouette';

interface Props {
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

type ShareState = 'idle' | 'working' | 'copied' | 'unsupported';

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
}: Props) {
  const { outfit, rainWarning } = rec;
  const [showGlossary, setShowGlossary] = useState(false);
  const [shareState, setShareState] = useState<ShareState>('idle');
  const glossary = useMemo(() => findGlossary(outfit.items), [outfit]);

  const flashState = (next: Exclude<ShareState, 'working'>) => {
    setShareState(next);
    setTimeout(() => setShareState('idle'), 2000);
  };

  const handleShare = async () => {
    const text = shareText(outfit);

    // 1순위: 실루엣까지 담은 이미지 한 장 (FR-34) — 카톡 등에서 줄글보다 훨씬 잘 읽힌다
    setShareState('working');
    const png = await renderOutfitPng(outfit);
    setShareState('idle');
    if (png && navigator.canShare) {
      const file = new File([png], `weatherfit-${outfit.id}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: outfit.name, text, files: [file] });
        } catch {
          // 사용자가 공유 시트를 취소한 경우 등 — 무시
        }
        return;
      }
    }

    // 2순위: 텍스트 공유 시트
    if (navigator.share) {
      try {
        await navigator.share({ title: outfit.name, text });
      } catch {
        // 취소 — 무시
      }
      return;
    }

    // 3순위: 클립보드 복사
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

  const wornGap = lastWorn ? daysAgo(lastWorn) : null;
  const shareLabel =
    shareState === 'working'
      ? '준비 중…'
      : shareState === 'copied'
        ? '복사됨'
        : shareState === 'unsupported'
          ? '공유 불가'
          : '공유';

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
        <button type="button" className="text-btn" onClick={handleShare} disabled={shareState === 'working'}>
          {shareLabel}
        </button>
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
              {glossary.map((g) => {
                const missing = missingTerms.includes(g.term);
                return (
                  <div key={g.term} className={missing ? 'glossary-item missing' : 'glossary-item'}>
                    <dt>{g.term}</dt>
                    <dd>
                      {/* "없어요"로 표시해 둔 아이템은 설명보다 대체제를 앞세운다 (FR-33) */}
                      {missing ? (
                        <>
                          <span className="glossary-sub-lead">대신 이렇게: {g.sub}</span>
                          <span className="glossary-sub">원래 아이템: {g.meaning}</span>
                        </>
                      ) : (
                        <>
                          {g.meaning}
                          <span className="glossary-sub">없으면: {g.sub}</span>
                        </>
                      )}
                      {onToggleMissingTerm && (
                        <button
                          type="button"
                          className={missing ? 'glossary-have active' : 'glossary-have'}
                          aria-pressed={missing}
                          onClick={() => onToggleMissingTerm(g.term)}
                        >
                          {missing ? '가지고 있어요' : '이건 없어요'}
                        </button>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
      )}
    </article>
  );
}
