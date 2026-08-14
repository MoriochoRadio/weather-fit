import { describe, expect, it } from "vitest";
import { OUTFITS } from "../data/outfits";
import type { StyleId, TempBand, ToneFilter } from "../types";
import { BAND_ORDER, alternateOutfit, recommendOutfits, tempBand } from "./recommend";

const STYLES: StyleId[] = ["oldmoney", "casual", "formal", "minimal"];
const TONES: ToneFilter[] = ["all", "cool", "warm"];

describe("tempBand", () => {
  it("체감 기온을 6단계로 나눈다", () => {
    expect(tempBand(-5)).toBe("freezing");
    expect(tempBand(0)).toBe("cold");
    expect(tempBand(8.9)).toBe("cold");
    expect(tempBand(9)).toBe("chilly");
    expect(tempBand(16.9)).toBe("chilly");
    expect(tempBand(17)).toBe("mild");
    expect(tempBand(22.9)).toBe("mild");
    expect(tempBand(23)).toBe("warm");
    expect(tempBand(27.9)).toBe("warm");
    expect(tempBand(28)).toBe("hot");
  });

  it("이상값은 가장 더운 극단이 아니라 중간값으로 폴백한다", () => {
    // 모든 비교가 false가 되어 조용히 'hot'으로 새면 한겨울에 반팔을 추천할 수 있다.
    expect(tempBand(Number.NaN)).toBe("mild");
    expect(tempBand(Number.POSITIVE_INFINITY)).toBe("mild");
    expect(tempBand(Number.NEGATIVE_INFINITY)).toBe("mild");
  });
});

describe("recommendOutfits", () => {
  it("모든 스타일·기온대·톤 조합에서 최소 한 벌을 돌려준다", () => {
    for (const style of STYLES) {
      for (const band of BAND_ORDER) {
        for (const tone of TONES) {
          const result = recommendOutfits(style, band, tone, false, "2026-08-14");
          expect(result.length, `${style}/${band}/${tone}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("같은 날·같은 조건이면 같은 결과를 준다", () => {
    const a = recommendOutfits("casual", "mild", "all", false, "2026-08-14");
    const b = recommendOutfits("casual", "mild", "all", false, "2026-08-14");
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id));
  });

  it("날짜가 바뀌면 후보 안에서 순서가 돌아간다", () => {
    const days = ["2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18"];
    const firsts = new Set(days.map((day) => recommendOutfits("casual", "mild", "all", false, day)[0].id));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it("요청한 스타일과 기온대에만 맞는 코디를 준다", () => {
    const result = recommendOutfits("formal", "cold", "all", false, "2026-08-14");
    for (const outfit of result) {
      expect(outfit.style).toBe("formal");
      expect(outfit.bands).toContain("cold");
    }
  });

  it("톤을 지정하면 그 톤만 남긴다", () => {
    for (const tone of ["cool", "warm"] as const) {
      const result = recommendOutfits("minimal", "mild", tone, false, "2026-08-14");
      // 해당 톤 후보가 실제로 존재하는 조합에서만 검증한다.
      const exists = OUTFITS.some((o) => o.style === "minimal" && o.bands.includes("mild") && o.tone === tone);
      if (exists) expect(result.every((o) => o.tone === tone)).toBe(true);
    }
  });

  it("비 오는 날에는 비에 강한 코디를 앞세운다", () => {
    for (const style of STYLES) {
      for (const band of BAND_ORDER) {
        const result = recommendOutfits(style, band, "all", true, "2026-08-14");
        const hasRainOk = result.some((o) => o.rainOk);
        if (hasRainOk) expect(result[0].rainOk, `${style}/${band}`).toBe(true);
      }
    }
  });
});

describe("alternateOutfit", () => {
  it("대안은 현재 기온대와 겹치지 않는다", () => {
    for (const style of STYLES) {
      for (const band of BAND_ORDER) {
        for (const direction of ["warmer", "cooler"] as const) {
          const alt = alternateOutfit(style, band, "all", false, "2026-08-14", direction);
          if (alt) expect(alt.bands, `${style}/${band}/${direction}`).not.toContain(band);
        }
      }
    }
  });

  it("양 끝 기온대에서는 바깥쪽 대안이 없다", () => {
    expect(alternateOutfit("casual", "freezing", "all", false, "2026-08-14", "warmer")).toBeNull();
    expect(alternateOutfit("casual", "hot", "all", false, "2026-08-14", "cooler")).toBeNull();
  });
});

describe("코디 데이터셋", () => {
  it("id가 고유하다", () => {
    const ids = OUTFITS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("모든 코디가 기온대와 필수 아이템을 갖는다", () => {
    for (const outfit of OUTFITS) {
      expect(outfit.bands.length, outfit.id).toBeGreaterThan(0);
      for (const band of outfit.bands) expect(BAND_ORDER).toContain(band as TempBand);
      expect(outfit.items.top, outfit.id).toBeTruthy();
      expect(outfit.items.bottom, outfit.id).toBeTruthy();
      expect(outfit.items.shoes, outfit.id).toBeTruthy();
      expect(outfit.palette.length, outfit.id).toBeGreaterThan(0);
    }
  });
});
