import { useCallback, useMemo, useState } from 'react';
import type { Outfit } from '../types';
import { COLOR_FAMILIES, familyById, type ColorFamily } from '../data/colorFamilies';
import {
  RATING_LABELS,
  judgeShoes,
  outfitsWithPair,
  pairColors,
  rankBottoms,
  rankShoes,
  type PairRating,
  type PairVerdict,
  type ShoeVerdict,
} from '../engine/colorPairing';
import { buildPairSilhouette } from '../engine/silhouette';
import { PieceSilhouette } from './OutfitSilhouette';
import { loadSavedComboTop, saveComboTop } from '../services/prefs';

interface Props {
  /** 조합에 해당하는 코디를 실제 카드로 보여줄 때 쓰는 렌더러 — 저장·기록 등 카드 기능을 App이 쥐고 있어 주입받는다 */
  renderOutfits: (outfits: Outfit[]) => React.ReactNode;
}

const RATING_MARK: Record<PairRating, string> = { best: '◎', good: '○', careful: '△' };
const GROUPS: Array<[PairRating, string]> = [
  ['best', '잘 어울려요'],
  ['good', '무난해요'],
  ['careful', '조심해서 — 이유와 해법'],
];

function ComboPreview({
  top,
  bottom,
  shoes,
  className,
}: {
  top: ColorFamily;
  bottom: ColorFamily;
  shoes: ColorFamily;
  className?: string;
}) {
  return <PieceSilhouette pieces={buildPairSilhouette(top.hex, bottom.hex, shoes.hex)} className={className} />;
}

/**
 * 색 조합 보기 (FR-36).
 *
 * 코디 추천이 "오늘 이걸 입어라"라면, 이 화면은 **자기 옷장을 열어 놓고 던지는 질문**에 답한다 —
 * "회색 니트가 있는데 아래는 뭘 입지". 그래서 날씨와 무관하게 색 두 개만으로 답하고,
 * 마지막에 그 조합을 실제로 쓰는 내장 코디로 이어 준다.
 */
/** 첫 진입 상태 — 저장해 둔 상의 색 기준으로 1등 하의·신발까지 미리 골라 둔다 */
function initialSelection() {
  const topId = loadSavedComboTop() ?? 'lightgray';
  const bottomId = rankBottoms(topId)[0].bottom.id;
  return { topId, bottomId, shoesId: rankShoes(topId, bottomId)[0].shoes.id };
}

export default function ColorCombos({ renderOutfits }: Props) {
  const [init] = useState(initialSelection);
  const [topId, setTopId] = useState(init.topId);
  const [bottomId, setBottomId] = useState(init.bottomId);
  const [shoesId, setShoesId] = useState(init.shoesId);
  const [showMatrix, setShowMatrix] = useState(false);

  const selectTop = useCallback((id: string) => {
    const nextBottom = rankBottoms(id)[0].bottom.id;
    setTopId(id);
    // 상의를 바꾸면 이전 하의·신발 선택이 문맥을 잃는다 — 새 기준 1등으로 옮겨 준다
    setBottomId(nextBottom);
    setShoesId(rankShoes(id, nextBottom)[0].shoes.id);
    saveComboTop(id);
  }, []);

  const selectBottom = useCallback(
    (id: string) => {
      setBottomId(id);
      // 하의가 바뀌면 신발 판정 기준이 통째로 바뀐다 (아래가 잡히는가는 하의 대비로 본다)
      setShoesId(rankShoes(topId, id)[0].shoes.id);
    },
    [topId],
  );

  const selectPair = useCallback((nextTop: string, nextBottom: string) => {
    setTopId(nextTop);
    setBottomId(nextBottom);
    setShoesId(rankShoes(nextTop, nextBottom)[0].shoes.id);
    saveComboTop(nextTop);
  }, []);

  const ranked = useMemo(() => rankBottoms(topId), [topId]);
  const rankedShoes = useMemo(() => rankShoes(topId, bottomId), [topId, bottomId]);
  const top = familyById(topId)!;
  const bottom = familyById(bottomId)!;
  const shoes = familyById(shoesId)!;
  const verdict = useMemo(() => pairColors(top, bottom), [top, bottom]);
  const shoeVerdict = useMemo(() => judgeShoes(top, bottom, shoes), [top, bottom, shoes]);
  const matching = useMemo(() => outfitsWithPair(topId, bottomId), [topId, bottomId]);

  const grouped = useMemo(
    () => GROUPS.map(([rating, label]) => ({ rating, label, items: ranked.filter((v) => v.rating === rating) })),
    [ranked],
  );

  return (
    <section className="combos" aria-label="색 조합 보기">
      <div className="section-head">
        <h2>상하의 색 조합</h2>
        <button type="button" className="text-btn" aria-pressed={showMatrix} onClick={() => setShowMatrix((v) => !v)}>
          {showMatrix ? '추천 순으로 보기' : '전체 표로 보기'}
        </button>
      </div>

      <p className="combos-lead">
        가지고 있는 <b>상의 색</b>을 고르면 어울리는 하의 색이, 하의를 고르면 그 위에 신을{' '}
        <b>신발 색</b>이 차례로 나옵니다. 등급은 밝기 차이 · 색의 개수 · 쿨웜 계열 세 가지로만 판단하니,
        이유를 읽고 직접 판단하셔도 됩니다.
      </p>

      <div className="swatch-row" role="group" aria-label="상의 색 선택">
        {COLOR_FAMILIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={c.id === topId ? 'swatch active' : 'swatch'}
            aria-pressed={c.id === topId}
            onClick={() => selectTop(c.id)}
          >
            <span className="swatch-chip" style={{ background: c.hex }} aria-hidden="true" />
            <span className="swatch-label">{c.label}</span>
          </button>
        ))}
      </div>
      <p className="swatch-note">{top.note}</p>

      {showMatrix ? (
        <div className="combo-layout">
          <ComboMatrix topId={topId} bottomId={bottomId} onSelect={selectPair} />
          {/* 표에서 칸을 누르면 옆 상세가 바뀐다 — 표만 있으면 등급은 알아도 이유를 알 수 없다 */}
          <ComboDetail verdict={verdict} shoeVerdict={shoeVerdict} />
        </div>
      ) : (
        <div className="combo-layout">
          <div className="combo-results">
            {grouped.map(
              (g) =>
                g.items.length > 0 && (
                  <div key={g.rating} className={`combo-group ${g.rating}`}>
                    <h3 className="combo-group-title">
                      {g.label} <span>{g.items.length}</span>
                    </h3>
                    <div className="combo-grid">
                      {g.items.map((v) => (
                        <button
                          key={v.bottom.id}
                          type="button"
                          className={v.bottom.id === bottomId ? 'combo-card active' : 'combo-card'}
                          aria-pressed={v.bottom.id === bottomId}
                          onClick={() => selectBottom(v.bottom.id)}
                        >
                          <ComboPreview
                            top={v.top}
                            bottom={v.bottom}
                            shoes={shoes}
                            className="silhouette combo-silhouette"
                          />
                          <span className="combo-card-name">{v.bottom.label}</span>
                          {v.classic && <span className="combo-classic">정석</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ),
            )}
          </div>

          <ComboDetail verdict={verdict} shoeVerdict={shoeVerdict} />
        </div>
      )}

      <ShoePicker
        ranked={rankedShoes}
        selectedId={shoesId}
        top={top}
        bottom={bottom}
        onSelect={setShoesId}
      />

      {/*
        해당 코디는 상세 패널 안이 아니라 아래 전체 폭에 둔다 — 400px 칸에 카드를 넣었더니
        "차콜 캐시미어 블렌드 코트"가 네 줄로 쪼개져, 모바일에서 이미 한 번 고쳤던 문제가
        데스크톱에서 되살아났다 (QA).
      */}
      <ComboOutfits verdict={verdict} matching={matching} renderOutfits={renderOutfits} />
    </section>
  );
}

function ComboOutfits({
  verdict,
  matching,
  renderOutfits,
}: {
  verdict: PairVerdict;
  matching: Outfit[];
  renderOutfits: Props['renderOutfits'];
}) {
  return (
    <div className="combo-outfits">
      <h3 className="combo-outfits-title">
        {verdict.top.label} 상의 + {verdict.bottom.label} 하의를 쓰는 코디
        {matching.length > 0 && ` ${matching.length}벌`}
      </h3>
      {matching.length === 0 ? (
        <p className="combo-outfits-none">이 조합을 그대로 쓰는 내장 코디는 아직 없어요.</p>
      ) : (
        <>
          {/*
            "조심해서" 등급인데 내장 코디가 이 조합을 쓰는 경우가 있다 — 규칙이 틀린 게 아니라
            소재·아이템으로 차이를 만든 경우다. 같은 화면이 서로 다른 말을 하는 것처럼 보이지
            않도록 왜 성립하는지 한 줄로 밝힌다.
          */}
          {verdict.rating === 'careful' && (
            <p className="combo-outfits-note">
              등급은 낮지만 아래 코디들은 성립합니다 — 소재나 겉옷으로 위아래를 갈라 놓았기 때문이에요.
            </p>
          )}
          {renderOutfits(matching)}
        </>
      )}
    </div>
  );
}

function ComboDetail({ verdict, shoeVerdict }: { verdict: PairVerdict; shoeVerdict: ShoeVerdict }) {
  return (
    <div className="combo-detail">
      <div className="combo-detail-head">
        <ComboPreview
          top={verdict.top}
          bottom={verdict.bottom}
          shoes={shoeVerdict.shoes}
          className="silhouette combo-detail-silhouette"
        />
        <div>
          <p className="combo-detail-pair">
            <span className="combo-slot">상의</span> {verdict.top.label}
            <br />
            <span className="combo-slot">하의</span> {verdict.bottom.label}
            <br />
            <span className="combo-slot">신발</span> {shoeVerdict.shoes.label}
          </p>
          <p className={`combo-rating ${verdict.rating}`}>
            {RATING_MARK[verdict.rating]} 상하의 {RATING_LABELS[verdict.rating]}
          </p>
        </div>
      </div>

      <p className="combo-headline">{verdict.headline}</p>
      <ul className="combo-reasons">
        {verdict.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="combo-tip">
        <span className="combo-tip-label">이렇게 하면</span> {verdict.tip}
      </p>

      {/* 신발은 상하의와 판정 기준이 달라(아래가 잡히는가) 결론도 따로 낸다 — 한 덩어리로 섞으면
          어느 쪽이 문제인지 알 수 없다 */}
      <div className="combo-shoe-verdict">
        <p className={`combo-rating ${shoeVerdict.rating}`}>
          {RATING_MARK[shoeVerdict.rating]} 신발 {RATING_LABELS[shoeVerdict.rating]}
        </p>
        <p className="combo-headline">{shoeVerdict.headline}</p>
        <ul className="combo-reasons">
          {shoeVerdict.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="combo-tip">
          <span className="combo-tip-label">이렇게 하면</span> {shoeVerdict.tip}
        </p>
      </div>
    </div>
  );
}

/** 상하의가 정해진 뒤 신발 색을 고르는 단계 (FR-38) */
function ShoePicker({
  ranked,
  selectedId,
  top,
  bottom,
  onSelect,
}: {
  ranked: ShoeVerdict[];
  selectedId: string;
  top: ColorFamily;
  bottom: ColorFamily;
  onSelect: (id: string) => void;
}) {
  const groups = GROUPS.map(([rating, label]) => ({
    rating,
    label,
    items: ranked.filter((v) => v.rating === rating),
  }));

  return (
    <section className="shoes" aria-label="신발 색 고르기">
      <h3 className="shoes-title">
        {top.label} 상의 · {bottom.label} 하의에 신을 신발
      </h3>
      <p className="shoes-lead">
        신발은 상하의와 다른 기준으로 봅니다 — 갈라져 보이는지가 아니라 <b>아래가 잡히는지</b>,
        그리고 <b>색이 셋이 되지 않는지</b>입니다.
      </p>
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <div key={g.rating} className={`combo-group ${g.rating}`}>
              <h4 className="combo-group-title">
                {g.label} <span>{g.items.length}</span>
              </h4>
              <div className="combo-grid">
                {g.items.map((v) => (
                  <button
                    key={v.shoes.id}
                    type="button"
                    className={v.shoes.id === selectedId ? 'combo-card active' : 'combo-card'}
                    aria-pressed={v.shoes.id === selectedId}
                    onClick={() => onSelect(v.shoes.id)}
                  >
                    <ComboPreview
                      top={top}
                      bottom={bottom}
                      shoes={v.shoes}
                      className="silhouette combo-silhouette"
                    />
                    {/*
                      실루엣 안에서 신발은 7px 남짓이라 블랙과 차콜이 구분되지 않는다 (QA).
                      하의 카드는 바지가 크게 칠해져 색이 바로 읽히지만 신발은 그렇지 않아
                      색 칩을 따로 붙인다 — 맥락(아래가 잡히는가)은 실루엣이, 색은 칩이 맡는다.
                    */}
                    <span className="combo-card-name">
                      <span className="combo-card-chip" style={{ background: v.shoes.hex }} aria-hidden="true" />
                      {v.shoes.label}
                    </span>
                    {v.classic && <span className="combo-classic">정석</span>}
                  </button>
                ))}
              </div>
            </div>
          ),
      )}
    </section>
  );
}

/** 전체 조합표 — "내 옷장에 뭐가 있더라"를 훑을 때는 목록보다 표가 빠르다 */
function ComboMatrix({
  topId,
  bottomId,
  onSelect,
}: {
  topId: string;
  bottomId: string;
  onSelect: (top: string, bottom: string) => void;
}) {
  return (
    <div className="matrix-wrap">
      <p className="matrix-legend">
        <b>◎</b> 잘 어울려요 · <b>○</b> 무난해요 · <b>△</b> 조심해서 — 세로가 상의, 가로가 하의입니다.
      </p>
      <div className="matrix-scroll">
        <table className="matrix">
          <caption className="sr-only">상의 색과 하의 색의 조합 등급표</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">상의 \ 하의</span>
              </th>
              {COLOR_FAMILIES.map((c) => (
                <th key={c.id} scope="col">
                  <span className="matrix-chip" style={{ background: c.hex }} aria-hidden="true" />
                  <span className="matrix-head-label">{c.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COLOR_FAMILIES.map((rowTop) => (
              <tr key={rowTop.id}>
                <th scope="row">
                  <span className="matrix-chip" style={{ background: rowTop.hex }} aria-hidden="true" />
                  <span className="matrix-head-label">{rowTop.label}</span>
                </th>
                {COLOR_FAMILIES.map((colBottom) => {
                  const v = pairColors(rowTop, colBottom);
                  const active = rowTop.id === topId && colBottom.id === bottomId;
                  return (
                    <td key={colBottom.id}>
                      <button
                        type="button"
                        className={`matrix-cell ${v.rating}${active ? ' active' : ''}`}
                        aria-pressed={active}
                        aria-label={`상의 ${rowTop.label}, 하의 ${colBottom.label} — ${RATING_LABELS[v.rating]}`}
                        onClick={() => onSelect(rowTop.id, colBottom.id)}
                      >
                        <span aria-hidden="true">{RATING_MARK[v.rating]}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
