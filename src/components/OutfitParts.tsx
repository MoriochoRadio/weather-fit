import { useState } from 'react';
import type { OutfitItems } from '../types';
import { findGlossary, isOwnableItem } from '../data/glossary';
import ItemIcon from './ItemIcon';

/**
 * 코디 카드와 "크게 보기" 상세가 함께 쓰는 조각들.
 *
 * 같은 내용을 두 군데에 각각 적어 두면 한쪽만 고쳐져 화면끼리 다른 말을 하게 된다 —
 * 이 프로젝트가 실루엣(화면 vs 공유 이미지)에서 이미 겪은 문제라 처음부터 한 곳에 둔다.
 */

const ITEM_LABELS: Array<[keyof OutfitItems, string]> = [
  ['outer', '아우터'],
  ['top', '상의'],
  ['bottom', '하의'],
  ['shoes', '신발'],
  ['acc', '액세서리'],
];

export function ItemList({ items }: { items: OutfitItems }) {
  return (
    <dl className="outfit-items">
      {ITEM_LABELS.map(([key, label]) => {
        const value = items[key];
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
  );
}

/**
 * 코디의 색을 띠로 보여준다.
 * 실루엣이 "어떤 옷인지"를 답한다면 이 띠는 "무슨 색 조합인지"를 답한다 — PC에서 카드가
 * 작아 실루엣만으로는 색이 안 읽힌다는 피드백에 대한 응답이다.
 */
export function PaletteStrip({ palette }: { palette: string[] }) {
  if (palette.length === 0) return null;
  return (
    <div className="palette" aria-hidden="true">
      {palette.map((hex, i) => (
        <span key={`${hex}-${i}`} className="palette-chip" style={{ background: hex }} />
      ))}
    </div>
  );
}

interface GlossaryProps {
  items: OutfitItems;
  missingTerms?: string[];
  onToggleMissingTerm?: (term: string) => void;
  /** 크게 보기에서는 접지 않고 처음부터 펼쳐 둔다 (공간이 넉넉하고, 그걸 보려고 연 화면이다) */
  defaultOpen?: boolean;
}

export function GlossaryPanel({
  items,
  missingTerms = [],
  onToggleMissingTerm,
  defaultOpen = false,
}: GlossaryProps) {
  const [open, setOpen] = useState(defaultOpen);
  const glossary = findGlossary(items);
  if (glossary.length === 0) return null;

  return (
    <div className="glossary">
      <button type="button" className="glossary-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? '풀이 접기' : `쉽게 풀이 · 대체 아이템 (${glossary.length})`}
      </button>
      {open && (
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
                  {/* 색·핏 같은 용어엔 "없어요"가 성립하지 않으므로 옷에만 버튼을 단다 (FR-33) */}
                  {onToggleMissingTerm && isOwnableItem(g.term) && (
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
  );
}
