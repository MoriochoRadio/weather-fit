import { describe, expect, it } from "vitest";
import { HEAVY_RAIN_MM, rainAlert } from "./rain";

describe("rainAlert — 강한 비는 강수량으로, 비 소식은 확률로", () => {
  it("확률이 높아도 강수량이 적으면 '강한 비'라고 하지 않는다 (2026-09-30 서울 84%·1.7mm 재현)", () => {
    const alert = rainAlert(84, 1.7);
    expect(alert?.id).toBe("rain-likely");
    expect(alert?.label).not.toContain("강한 비");
    expect(alert?.level).toBe("attention");
    expect(alert?.detail).toContain("84%");
    expect(alert?.detail).toContain("1.7mm");
  });

  it("예상 강수량이 기준 이상이고 확률도 비 대응 기준 이상이면 강한 비로 알린다", () => {
    expect(rainAlert(90, 12)).toMatchObject({ id: "heavy-rain", label: "강한 비 가능성", level: "critical" });
    expect(rainAlert(50, HEAVY_RAIN_MM)?.id).toBe("heavy-rain");
    expect(rainAlert(90, 12)?.detail).toContain("12mm");
  });

  it("기준 바로 아래 강수량은 강한 비가 아니다", () => {
    expect(rainAlert(95, 9.9)?.id).toBe("rain-likely");
  });

  it("확률이 낮으면 강수량이 많아도 강한 비로 단정하지 않는다 — 코디의 비 대응(≥50%)과 어긋나지 않게", () => {
    expect(rainAlert(40, 15)).toBeNull();
  });

  it("강수량을 모르는 구버전 스냅샷은 확률로만 비 소식을 알리고 강한 비라고 하지 않는다", () => {
    expect(rainAlert(84)?.id).toBe("rain-likely");
    expect(rainAlert(84, null)?.id).toBe("rain-likely");
    expect(rainAlert(84, Number.NaN)?.id).toBe("rain-likely");
    expect(rainAlert(84)?.detail).not.toContain("mm");
  });

  it("확률도 낮고 양도 적으면 경고하지 않는다", () => {
    expect(rainAlert(65, 3)).toBeNull();
    expect(rainAlert(0, 0)).toBeNull();
  });
});
