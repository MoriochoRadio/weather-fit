import type { Outfit } from '../types';
import { SILHOUETTE_VIEWBOX, buildSilhouette, detailStroke } from '../engine/silhouette';

/**
 * 코디 카드를 PNG 이미지로 만든다 (FR-34).
 *
 * 텍스트만 공유하면 카톡에서 줄글로 흘러 읽히지 않는다는 문제 때문에, 실루엣까지 담은
 * 한 장짜리 카드를 만든다. 외부 라이브러리 없이 "SVG 문자열 → data URL → canvas → PNG" 경로를 쓴다.
 * 외부 리소스를 전혀 참조하지 않으므로 canvas가 오염(taint)되지 않아 toBlob이 정상 동작한다.
 */

const W = 720;
const H = 1120;
/** 실루엣 배치 — 아래 ITEMS_TOP과 겹치지 않도록 크기를 정한다 (132 * SILHOUETTE_SCALE 만큼 세로를 먹는다) */
const SILHOUETTE_TOP = 160;
const SILHOUETTE_SCALE = 2.1;
/** 아이템 목록 시작 y — 실루엣이 끝나는 지점보다 아래여야 한다 */
const ITEMS_TOP = 480;
/** 팔레트·꼬리말은 내용 길이와 무관하게 바닥에 고정 */
const FOOTER_Y = H - 90;

/** XML 텍스트 노드에 그대로 넣으면 안 되는 문자 이스케이프 */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 글자수 기준 줄바꿈 — canvas에 그리기 전이라 실제 폭을 잴 수 없어 한글 기준 보수적으로 나눈다 */
function wrap(text: string, perLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > perLine) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function silhouetteMarkup(outfit: Outfit, x: number, y: number, scale: number): string {
  const pieces = buildSilhouette(outfit.items);
  const inner = pieces
    .map((p) => {
      const details = p.asset.details;
      const body = `<path d="${p.asset.body}" fill="${p.color}" fill-rule="evenodd" stroke="rgba(20,23,27,0.28)" stroke-width="1" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
      const detail = details
        ? `<path d="${details}" fill="none" stroke="${detailStroke(p.color)}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`
        : '';
      const content = p.flip ? `<g transform="translate(100,0) scale(-1,1)">${body}${detail}</g>` : body + detail;
      return `<svg x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" viewBox="${p.asset.viewBox}">${content}</svg>`;
    })
    .join('');
  return `<g transform="translate(${x},${y}) scale(${scale})"><svg width="${SILHOUETTE_VIEWBOX.width}" height="${SILHOUETTE_VIEWBOX.height}" viewBox="0 0 ${SILHOUETTE_VIEWBOX.width} ${SILHOUETTE_VIEWBOX.height}">${inner}</svg></g>`;
}

function buildSvg(outfit: Outfit): string {
  const { items } = outfit;
  const rows: Array<[string, string]> = [];
  if (items.outer) rows.push(['아우터', items.outer]);
  rows.push(['상의', items.top], ['하의', items.bottom], ['신발', items.shoes]);
  if (items.acc && !items.acc.startsWith('없음')) rows.push(['액세서리', items.acc]);

  const FONT = 'system-ui, -apple-system, \'Malgun Gothic\', sans-serif';
  let y = ITEMS_TOP;
  const itemLines = rows
    .map(([label, value]) => {
      const parts = wrap(value, 22);
      const block = [
        `<text x="60" y="${y}" font-family="${FONT}" font-size="20" fill="#8b8f98">${esc(label)}</text>`,
        ...parts.map(
          (line, i) =>
            `<text x="170" y="${y + i * 30}" font-family="${FONT}" font-size="22" fill="#15171b">${esc(line)}</text>`,
        ),
      ].join('');
      y += Math.max(parts.length, 1) * 30 + 14;
      return block;
    })
    .join('');

  // 팁은 남은 자리만큼만 — 아이템이 길어 아래로 밀리면 줄 수를 줄여 팔레트를 침범하지 않게 한다
  const tipTop = y + 46;
  const tipRoom = Math.max(0, Math.floor((FOOTER_Y - 24 - tipTop) / 30));
  const tipLines = wrap(outfit.tip, 32)
    .slice(0, Math.min(4, tipRoom))
    .map(
      (line, i) =>
        `<text x="60" y="${tipTop + i * 30}" font-family="${FONT}" font-size="20" fill="#4a4f57">${esc(line)}</text>`,
    )
    .join('');

  const palette = outfit.palette
    .slice(0, 5)
    .map(
      (hex, i) =>
        `<rect x="${60 + i * 40}" y="${FOOTER_Y}" width="30" height="30" rx="4" fill="${hex}" stroke="rgba(20,23,27,0.18)"/>`,
    )
    .join('');

  const silhouetteX = W / 2 - (100 * SILHOUETTE_SCALE) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#f4f6f7"/>
<rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="14" fill="#ffffff" stroke="#e0e4e9"/>
<text x="60" y="94" font-family="${FONT}" font-size="20" letter-spacing="3" fill="#8b8f98">WEATHERFIT</text>
<text x="60" y="146" font-family="${FONT}" font-size="34" font-weight="600" fill="#15171b">${esc(outfit.name)}</text>
${silhouetteMarkup(outfit, silhouetteX, SILHOUETTE_TOP, SILHOUETTE_SCALE)}
${itemLines}
<line x1="60" y1="${y + 12}" x2="${W - 60}" y2="${y + 12}" stroke="#e0e4e9"/>
${tipLines}
${palette}
<text x="${W - 60}" y="${FOOTER_Y + 22}" text-anchor="end" font-family="${FONT}" font-size="18" fill="#8b8f98">오늘 날씨에 맞춘 코디</text>
</svg>`;
}

/** SVG 문자열을 PNG Blob으로. 실패하면 null (호출 측이 텍스트 공유로 폴백) */
export async function renderOutfitPng(outfit: Outfit): Promise<Blob | null> {
  try {
    const svg = buildSvg(outfit);
    // btoa는 라틴1만 받으므로 한글이 섞인 SVG는 unescape(encodeURIComponent()) 대신
    // Blob URL로 넘긴다 — 인코딩 문제 없이 그대로 그려진다.
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('실루엣 이미지를 만들지 못했어요'));
        img.src = url;
      });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement('canvas');
      canvas.width = W * ratio;
      canvas.height = H * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.scale(ratio, ratio);
      ctx.drawImage(img, 0, 0, W, H);
      return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}
