/**
 * 비 경고 판정.
 *
 * 강수 확률은 "비가 올지"이고 강수량은 "얼마나 올지"다. 확률만 보고 "강한 비"라고 하면
 * 확률 84%·강수량 1.7mm인 날, 맑은 하늘 아래에 강한 비 경고가 뜬다.
 * 그래서 "강한 비"는 예상 강수량으로, "비 소식"은 확률로 가른다.
 */

/** 하루 예상 강수량이 이 이상이면 "강한 비"로 본다 (mm). */
export const HEAVY_RAIN_MM = 10;
/** 강수량이 많아도 확률이 이보다 낮으면 강한 비로 단정하지 않는다 — 앱의 비 대응(우산·방수 신발) 기준과 같다. */
export const RAIN_READY_PROBABILITY = 50;
/** 강수량과 무관하게 비 소식을 알리는 확률 (%). */
export const RAIN_LIKELY_PROBABILITY = 70;

export type RainAlert = {
  id: "heavy-rain" | "rain-likely";
  label: string;
  detail: string;
  action: string;
  level: "critical" | "attention";
};

function formatMm(amount: number) {
  return `${Number(amount.toFixed(1))}mm`;
}

/**
 * @param probability 오늘 최고 강수 확률 (%)
 * @param amountMm 오늘 예상 강수량 (mm). 구버전 스냅샷처럼 값이 없으면 undefined.
 */
export function rainAlert(probability: number, amountMm?: number | null): RainAlert | null {
  const amount = typeof amountMm === "number" && Number.isFinite(amountMm) ? amountMm : null;

  if (amount !== null && amount >= HEAVY_RAIN_MM && probability >= RAIN_READY_PROBABILITY) {
    return {
      id: "heavy-rain",
      label: "강한 비 가능성",
      detail: `오늘 강수 확률 ${probability}%, 예상 강수량 ${formatMm(amount)}예요.`,
      action: "방수 신발·접이식 우산과 여벌 양말을 챙기세요.",
      level: "critical",
    };
  }

  if (probability >= RAIN_LIKELY_PROBABILITY) {
    return {
      id: "rain-likely",
      label: "비 올 확률 높음",
      detail: amount === null
        ? `오늘 최고 강수 확률이 ${probability}%예요.`
        : `오늘 최고 강수 확률은 ${probability}%, 예상 강수량은 ${formatMm(amount)}예요.`,
      action: amount === null
        ? "접이식 우산과 발등이 덮이는 신발을 챙기세요."
        : "양은 많지 않지만 접이식 우산을 챙기세요.",
      level: "attention",
    };
  }

  return null;
}
