import { useCallback, useEffect, useRef } from 'react';
import type { Recommendation } from '../engine/recommend';
import { RATING_LABELS, judgeShoes, outfitColors, pairColors } from '../engine/colorPairing';
import OutfitSilhouette from './OutfitSilhouette';
import ShareButton from './ShareButton';
import { GlossaryPanel, ItemList, PaletteStrip } from './OutfitParts';

interface Props {
  /** 지금 보고 있는 목록 전체 — 창을 닫지 않고 옆 코디로 넘어갈 수 있게 통째로 받는다 */
  recs: Recommendation[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  savedIds: string[];
  onToggleSave: (outfitId: string) => void;
  worn: (outfitId: string) => boolean;
  onToggleWorn?: (outfitId: string) => void;
  missingTerms: string[];
  onToggleMissingTerm: (term: string) => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * 코디 "크게 보기" (FR-37).
 *
 * PC에서 카드 3장이 나란히 놓이면 실루엣이 80px 안팎으로 줄어 "어떤 느낌인지 확 오지 않는다"는
 * 피드백에서 나온 화면이다. 목록은 훑기 위한 것이고, 이 창은 **한 벌을 제대로 보기 위한 것**이라
 * 실루엣을 크게 놓고 색 조합 판정(FR-36)까지 함께 읽어 준다.
 *
 * 목록 안에서 좌우로 넘길 수 있게 한 이유: 카드를 하나씩 열고 닫으며 비교하는 동작이
 * 실제로는 "옆에 걸린 옷을 넘겨 보는" 행동이기 때문이다.
 */
export default function OutfitDetail({
  recs,
  index,
  onIndexChange,
  onClose,
  savedIds,
  onToggleSave,
  worn,
  onToggleWorn,
  missingTerms,
  onToggleMissingTerm,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const rec = recs[index];

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < recs.length) onIndexChange(next);
    },
    [index, recs.length, onIndexChange],
  );

  // 열릴 때 포커스를 창 안으로 들여오고, 닫힐 때 원래 있던 버튼으로 되돌린다
  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const { body } = document;
    const prevOverflow = body.style.overflow;
    // 창 뒤 페이지가 같이 스크롤되면 닫았을 때 엉뚱한 위치에 가 있게 된다
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevOverflow;
      restoreRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      // preventDefault가 없으면 코디가 넘어가면서 창까지 같이 스크롤된다
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
        return;
      }
      if (e.key !== 'Tab') return;
      // 포커스가 창 밖(뒤에 깔린 목록)으로 새 나가면 스크린리더·키보드 사용자가 길을 잃는다
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [go, onClose]);

  if (!rec) return null;
  const { outfit, rainWarning } = rec;
  const colors = outfitColors(outfit);
  const verdict = pairColors(colors.top, colors.bottom);
  const shoeVerdict = judgeShoes(colors.top, colors.bottom, colors.shoes);
  const saved = savedIds.includes(outfit.id);

  return (
    <div
      className="detail-backdrop"
      // 배경 "그 자체"를 눌렀을 때만 닫는다 — stopPropagation만 쓰면 창 안에서 시작해 밖에서
      // 끝난 드래그(글자 선택 등)까지 클릭으로 잡혀 창이 닫힌다
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="detail-head">
          <span className="outfit-no">
            {String(index + 1).padStart(2, '0')} / {String(recs.length).padStart(2, '0')}
            {outfit.tone === 'warm' && <span className="outfit-tone">웜톤</span>}
          </span>
          <div className="detail-head-actions">
            {rainWarning && <span className="outfit-warn">우천 주의 소재</span>}
            <button
              type="button"
              className={saved ? 'outfit-save active' : 'outfit-save'}
              aria-pressed={saved}
              aria-label={saved ? '즐겨찾는 코디에서 빼기' : '즐겨찾는 코디에 담기'}
              onClick={() => onToggleSave(outfit.id)}
            >
              {saved ? '★' : '☆'}
            </button>
            <button type="button" className="detail-close" onClick={onClose} aria-label="크게 보기 닫기">
              ✕
            </button>
          </div>
        </header>

        {/*
          제목은 실루엣보다 위에 둔다 — 아래 두 칸이 모바일에서 세로로 쌓이면서 240px 실루엣이
          이름을 화면 밖으로 밀어냈다 (v1.9 QA). 창의 제목이 맨 위에 오는 건 대화상자의 일반적인
          구조이기도 하다.
        */}
        <h2 className="detail-title" id="detail-title">
          {outfit.name}
        </h2>

        <div className="detail-body">
          <div className="detail-figure">
            <OutfitSilhouette items={outfit.items} className="silhouette detail-silhouette" />
            <PaletteStrip palette={outfit.palette} />
            <p className="detail-colors">
              상의 <b>{colors.top.label}</b> + 하의 <b>{colors.bottom.label}</b>
              <span className={`combo-rating inline ${verdict.rating}`}>{RATING_LABELS[verdict.rating]}</span>
            </p>
            <p className="detail-colors-why">{verdict.headline}</p>
            {/* 신발은 판정 기준이 달라 따로 읽어 준다 (FR-38) — 색 조합 화면과 같은 엔진을 쓴다 */}
            <p className="detail-colors">
              신발 <b>{colors.shoes.label}</b>
              <span className={`combo-rating inline ${shoeVerdict.rating}`}>{RATING_LABELS[shoeVerdict.rating]}</span>
            </p>
            <p className="detail-colors-why">{shoeVerdict.reasons[0]}</p>
          </div>

          <div className="detail-main">
            <ItemList items={outfit.items} />
            <p className="outfit-point">
              <span className="outfit-point-label">포인트</span> {outfit.point}
            </p>
            <p className="outfit-tip">{outfit.tip}</p>
            <div className="outfit-actions">
              <ShareButton outfit={outfit} />
              {onToggleWorn && (
                <button
                  type="button"
                  className={worn(outfit.id) ? 'text-btn worn active' : 'text-btn worn'}
                  aria-pressed={worn(outfit.id)}
                  onClick={() => onToggleWorn(outfit.id)}
                >
                  {worn(outfit.id) ? '오늘 입음 ✓' : '오늘 입었어요'}
                </button>
              )}
            </div>
            <GlossaryPanel
              // 코디를 바꿔도 같은 컴포넌트가 재사용되면 이전 코디에서 펼쳐 둔 상태가 남는다 — key로 초기화
              key={outfit.id}
              items={outfit.items}
              missingTerms={missingTerms}
              onToggleMissingTerm={onToggleMissingTerm}
              defaultOpen
            />
          </div>
        </div>

        {recs.length > 1 && (
          <nav className="detail-nav" aria-label="코디 넘기기">
            <button type="button" className="text-btn" onClick={() => go(-1)} disabled={index === 0}>
              ← 이전 코디
            </button>
            <button type="button" className="text-btn" onClick={() => go(1)} disabled={index === recs.length - 1}>
              다음 코디 →
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
