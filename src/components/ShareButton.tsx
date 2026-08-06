import { useState } from 'react';
import type { Outfit } from '../types';
import { renderOutfitPng } from '../services/shareImage';

type ShareState = 'idle' | 'working' | 'copied' | 'unsupported';

/** 코디를 텍스트로 정리해 Web Share API(지원 안 하면 클립보드)로 공유한다 (FR-27) */
export function shareText(outfit: Outfit): string {
  const { items } = outfit;
  const lines = [`WeatherFit — ${outfit.name}`];
  if (items.outer) lines.push(`아우터: ${items.outer}`);
  lines.push(`상의: ${items.top}`, `하의: ${items.bottom}`, `신발: ${items.shoes}`);
  if (items.acc) lines.push(`액세서리: ${items.acc}`);
  lines.push('', outfit.tip);
  return lines.join('\n');
}

/**
 * 공유 버튼 (FR-27/34).
 * 카드와 "크게 보기" 상세가 같은 동작을 해야 해서 버튼째 떼어 둔다 — 폴백 3단계와
 * 스크린리더 알림까지 한 벌로 움직이므로 나눠 두면 한쪽만 낡는다.
 */
export default function ShareButton({ outfit }: { outfit: Outfit }) {
  const [state, setState] = useState<ShareState>('idle');

  const flashState = (next: Exclude<ShareState, 'working'>) => {
    setState(next);
    setTimeout(() => setState('idle'), 2000);
  };

  const handleShare = async () => {
    const text = shareText(outfit);

    // 1순위: 실루엣까지 담은 이미지 한 장 (FR-34) — 카톡 등에서 줄글보다 훨씬 잘 읽힌다
    setState('working');
    const png = await renderOutfitPng(outfit);
    setState('idle');
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

  const label =
    state === 'working' ? '준비 중…' : state === 'copied' ? '복사됨' : state === 'unsupported' ? '공유 불가' : '공유';

  return (
    <>
      <button type="button" className="text-btn" onClick={handleShare} disabled={state === 'working'}>
        {label}
      </button>
      {/* 버튼 라벨 변경만으론 스크린리더에 안정적으로 전달되지 않아 별도 라이브 리전으로 알림 (QA) */}
      <span className="sr-only" role="status">
        {state === 'copied'
          ? '코디 내용이 클립보드에 복사됐어요'
          : state === 'unsupported'
            ? '이 브라우저에서는 공유를 지원하지 않아요'
            : ''}
      </span>
    </>
  );
}
